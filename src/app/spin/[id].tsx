import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { batchRemoveBackground, type BatchProgress } from '@/features/background-removal/batch';
import { getBackground } from '@/features/editor/backgrounds';
import { BackgroundStrip } from '@/features/editor/BackgroundStrip';
import { shadowEnabled } from '@/features/editor/groundShadow';
import { HotspotSheet } from '@/features/editor/HotspotSheet';
import { createHotspot } from '@/features/editor/hotspots';
import type { EditorMode, SpinHotspot } from '@/features/projects/types';
import { useProject } from '@/features/projects/useProjects';
import { getSpinFrameUrls, saveSpin, uploadSpinFrame } from '@/features/spin/spin.api';
import { invalidateSpinFrames, useSpinFrames } from '@/features/spin/useSpin';
import { SpinViewer } from '@/features/spin/SpinViewer';
import { usePendingUploads } from '@/features/uploads/usePendingUploads';
import type { SpinFrameUploadPayload } from '@/features/uploads/uploads';
import { mapWithConcurrency } from '@/lib/concurrency';
import { haptics } from '@/lib/haptics';
import { uploadFileUri, type UploadTask } from '@/lib/uploadQueue';
import { useDebouncedAutosave } from '@/lib/useDebouncedAutosave';
import { colors, radius, spacing } from '@/theme';

export default function SpinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: project } = useProject(id);

  const [hydrated, setHydrated] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [hasCutout, setHasCutout] = useState(false);
  const [backgroundId, setBackgroundId] = useState('transparent');
  const [shadow, setShadowState] = useState<boolean | undefined>(undefined);
  const [hotspots, setHotspots] = useState<SpinHotspot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('marketing');
  const [cutProgress, setCutProgress] = useState<BatchProgress | null>(null);

  // hydrate local editing state once from the project's spin data (async load)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!project || hydrated) return;
    const spin = project.spin;
    if (spin) {
      setFrameCount(spin.frameCount);
      setHasCutout(Boolean(spin.hasCutout));
      setBackgroundId(spin.backgroundId ?? 'transparent');
      setShadowState(spin.shadow);
      setHotspots(spin.hotspots ?? []);
    }
    setHydrated(true);
  }, [project, hydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 360° frames still waiting in the upload queue (offline capture / sync in
  // flight). Shown from their local outbox file; cutout is gated on sync done.
  const pendingUploads = usePendingUploads(id);
  const pendingFrames = useMemo(() => {
    const map: Record<number, UploadTask> = {};
    pendingUploads.forEach((t) => {
      if (t.kind === 'spin-frame') map[(t.payload as SpinFrameUploadPayload).frame] = t;
    });
    return map;
  }, [pendingUploads]);
  const pendingCount = pendingUploads.filter((t) => t.kind === 'spin-frame').length;

  // If finish-time saveSpin ran offline, the DB says 0 frames while the queue
  // holds the truth — adopt the queue's count so the spin is usable right away.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hydrated) return;
    const queued = Object.keys(pendingFrames).reduce((m, k) => Math.max(m, Number(k) + 1), 0);
    if (queued > frameCount) setFrameCount(queued);
  }, [hydrated, pendingFrames, frameCount]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { data: frameUrls } = useSpinFrames(id, frameCount, hasCutout);

  // Prefer the local outbox file for frames not yet uploaded — the spin is
  // fully viewable offline, and tiles swap to signed URLs as uploads land.
  const mergedFrameUrls = useMemo(() => {
    const remote = frameUrls ?? [];
    return Array.from({ length: frameCount }, (_, i) => {
      const pending = pendingFrames[i];
      return pending && !hasCutout ? uploadFileUri(pending) : (remote[i] ?? null);
    });
  }, [frameUrls, pendingFrames, frameCount, hasCutout]);

  // Shared autosave: retry with backoff + flush when leaving the screen —
  // the spin now has the same no-data-loss guarantees as the editor.
  const { status: saveStatus } = useDebouncedAutosave({
    signature: JSON.stringify([frameCount, hasCutout, backgroundId, hotspots, shadow]),
    enabled: hydrated,
    save: useCallback(async () => {
      await saveSpin(id, {
        frameCount,
        hasCutout,
        backgroundId,
        hotspots,
        ...(shadow !== undefined ? { shadow } : {}),
      });
    }, [id, frameCount, hasCutout, backgroundId, hotspots, shadow]),
  });

  // One toast per failure streak (retries continue silently in the background).
  const failureToasted = useRef(false);
  useEffect(() => {
    if (saveStatus === 'failed' && !failureToasted.current) {
      failureToasted.current = true;
      toast.show('Could not save 360° changes — retrying in background', 'error');
    } else if (saveStatus === 'saved') {
      failureToasted.current = false;
    }
  }, [saveStatus, toast]);

  const selected = selectedId ? hotspots.find((h) => h.id === selectedId) ?? null : null;
  const spinShadowOn = shadowEnabled(getBackground(backgroundId), shadow);

  const addHotspot = useCallback(
    (frame: number, x: number, y: number) => {
      const count = hotspots.filter((h) => h.kind === mode).length + 1;
      const h: SpinHotspot = { ...createHotspot(mode, x, y, count), frame };
      setHotspots((hs) => [...hs, h]);
      setSelectedId(h.id);
      haptics.light();
    },
    [hotspots, mode]
  );

  const moveHotspot = useCallback((hid: string, x: number, y: number) => {
    setHotspots((hs) => hs.map((h) => (h.id === hid ? { ...h, x, y } : h)));
  }, []);

  const cutout360 = useCallback(async () => {
    if (frameCount === 0 || pendingCount > 0) return;
    setCutProgress({ done: 0, total: frameCount });
    try {
      const originals = await getSpinFrameUrls(id, frameCount, false);
      // Keep each url paired with its ORIGINAL frame index so a failed/missing
      // frame doesn't shift every subsequent cutout by one.
      const indexed = originals
        .map((u, i) => (u ? { uri: u, frame: i } : null))
        .filter((x): x is { uri: string; frame: number } => x !== null);
      const cutouts = await batchRemoveBackground(
        indexed.map((x) => x.uri),
        (p) => setCutProgress(p)
      );
      // Upload the cutout frames in parallel (bounded) instead of one-by-one.
      // A single failed upload no longer aborts the rest — we just count it out.
      const toUpload = cutouts
        .map((c, i) => (c ? { uri: c, frame: indexed[i].frame } : null))
        .filter((x): x is { uri: string; frame: number } => x !== null);
      setCutProgress({ done: 0, total: toUpload.length });
      const uploaded = await mapWithConcurrency(
        toUpload,
        async (item) => {
          try {
            await uploadSpinFrame(id, item.frame, item.uri, true);
            return true;
          } catch {
            return false;
          }
        },
        { concurrency: 4, onSettled: (done, total) => setCutProgress({ done, total }) }
      );
      const ok = uploaded.filter(Boolean).length;
      // All-or-nothing: flipping hasCutout with missing frames makes the viewer
      // request cutout files that don't exist — broken images mid-rotation.
      if (ok > 0 && ok === frameCount) {
        setHasCutout(true);
        setBackgroundId((b) => (b === 'transparent' ? 'studio-graphite' : b));
        invalidateSpinFrames(qc, id);
        haptics.success();
        toast.show('360° background removed', 'success');
      } else if (ok > 0) {
        toast.show(`Cut out incomplete (${ok}/${frameCount} frames) — tap again to retry`, 'error');
      } else {
        toast.show('Could not cut out the 360', 'error');
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Cut out failed', 'error');
    } finally {
      setCutProgress(null);
    }
  }, [frameCount, pendingCount, id, qc, toast]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="heading" style={styles.title}>
          360° spin
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {frameCount === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="refresh"
            title="No 360° yet"
            subtitle="Walk around the car and capture ~24 frames."
            actionLabel="Capture 360°"
            onAction={() => router.replace({ pathname: '/capture/spin/[id]', params: { id } })}
          />
        </View>
      ) : (
        <>
          <View style={styles.modeRow}>
            <SegmentedControl<EditorMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'marketing', label: 'Marketing', icon: 'sparkles' },
                { value: 'inspection', label: 'Inspection', icon: 'wrench' },
              ]}
            />
          </View>

          <View style={styles.viewer}>
            <SpinViewer
              frameUrls={mergedFrameUrls}
              cutout={hasCutout}
              backgroundId={backgroundId}
              shadow={shadow}
              hotspots={hotspots}
              selectedId={selectedId}
              editable
              onAddHotspot={addHotspot}
              onMoveHotspot={moveHotspot}
              onSelectHotspot={setSelectedId}
            />
          </View>

          {hasCutout ? (
            <>
              {backgroundId !== 'transparent' ? (
                <View style={styles.shadowRow}>
                  <PressableScale
                    style={[styles.shadowToggle, spinShadowOn ? styles.shadowToggleOn : null]}
                    onPress={() => {
                      haptics.selection();
                      setShadowState(!spinShadowOn);
                    }}
                    haptic="selection"
                  >
                    <Icon name="sparkles" size={16} color={spinShadowOn ? colors.primary : colors.textMuted} />
                    <Text variant="label" color={spinShadowOn ? colors.primary : colors.textMuted}>
                      Shadow {spinShadowOn ? 'on' : 'off'}
                    </Text>
                  </PressableScale>
                </View>
              ) : null}
              <BackgroundStrip activeId={backgroundId} onSelect={setBackgroundId} />
            </>
          ) : (
            <View style={styles.toolbar}>
              <Button
                title={
                  pendingCount > 0
                    ? `Uploading ${pendingCount} frame${pendingCount === 1 ? '' : 's'}…`
                    : 'Cut out 360°'
                }
                icon="scissors"
                onPress={cutout360}
                disabled={pendingCount > 0}
                style={styles.flex}
              />
            </View>
          )}
        </>
      )}

      <HotspotSheet
        hotspot={selected}
        onChange={(patch) =>
          selected && setHotspots((hs) => hs.map((h) => (h.id === selected.id ? { ...h, ...patch } : h)))
        }
        onDelete={() => {
          if (selected) {
            haptics.medium();
            setHotspots((hs) => hs.filter((h) => h.id !== selected.id));
            setSelectedId(null);
          }
        }}
        onClose={() => setSelectedId(null)}
      />

      {cutProgress ? (
        <View style={styles.progress}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text variant="bodyStrong">Removing 360° backgrounds…</Text>
          <Text variant="caption" muted>
            {cutProgress.done} / {cutProgress.total} frames · on your device
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  title: { flex: 1, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modeRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  viewer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolbar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  flex: { flex: 1 },
  shadowRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  shadowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shadowToggleOn: { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
