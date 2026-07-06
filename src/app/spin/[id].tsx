import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { batchRemoveBackground, type BatchProgress } from '@/features/background-removal/batch';
import { BACKGROUND_PRESETS, type BackgroundPreset } from '@/features/editor/backgrounds';
import { HotspotSheet } from '@/features/editor/HotspotSheet';
import type { EditorMode, SpinHotspot } from '@/features/projects/types';
import { useProject } from '@/features/projects/useProjects';
import { getSpinFrameUrls, saveSpin, uploadSpinFrame } from '@/features/spin/spin.api';
import { SpinViewer } from '@/features/spin/SpinViewer';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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
      setHotspots(spin.hotspots ?? []);
    }
    setHydrated(true);
  }, [project, hydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { data: frameUrls } = useQuery({
    queryKey: ['spin-frames', id, frameCount, hasCutout],
    queryFn: () => getSpinFrameUrls(id, frameCount, hasCutout),
    enabled: frameCount > 0,
  });

  // debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSpin(id, { frameCount, hasCutout, backgroundId, hotspots }).catch(() => {});
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, id, frameCount, hasCutout, backgroundId, hotspots]);

  const selected = selectedId ? hotspots.find((h) => h.id === selectedId) ?? null : null;

  const addHotspot = useCallback(
    (frame: number, x: number, y: number) => {
      const count = hotspots.length + 1;
      const h: SpinHotspot = {
        id: uid(),
        kind: mode,
        frame,
        x,
        y,
        title: mode === 'marketing' ? `Feature ${count}` : `Damage ${count}`,
        ...(mode === 'inspection' ? { severity: 'medium' as const } : {}),
      };
      setHotspots((hs) => [...hs, h]);
      setSelectedId(h.id);
      haptics.light();
    },
    [hotspots.length, mode]
  );

  const moveHotspot = useCallback((hid: string, x: number, y: number) => {
    setHotspots((hs) => hs.map((h) => (h.id === hid ? { ...h, x, y } : h)));
  }, []);

  const cutout360 = useCallback(async () => {
    if (frameCount === 0) return;
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
      let ok = 0;
      for (let i = 0; i < cutouts.length; i++) {
        const c = cutouts[i];
        if (c) {
          await uploadSpinFrame(id, indexed[i].frame, c, true);
          ok++;
        }
      }
      if (ok > 0) {
        setHasCutout(true);
        setBackgroundId((b) => (b === 'transparent' ? 'studio-graphite' : b));
        qc.invalidateQueries({ queryKey: ['spin-frames', id] });
        haptics.success();
        toast.show('360° background removed', 'success');
      } else {
        toast.show('Could not cut out the 360', 'error');
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Cut out failed', 'error');
    } finally {
      setCutProgress(null);
    }
  }, [frameCount, id, qc, toast]);

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
              frameUrls={frameUrls ?? []}
              cutout={hasCutout}
              backgroundId={backgroundId}
              hotspots={hotspots}
              selectedId={selectedId}
              editable
              onAddHotspot={addHotspot}
              onMoveHotspot={moveHotspot}
              onSelectHotspot={setSelectedId}
            />
          </View>

          {hasCutout ? (
            <View style={styles.stripWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {BACKGROUND_PRESETS.map((bg) => (
                  <Swatch key={bg.id} bg={bg} active={bg.id === backgroundId} onPress={() => setBackgroundId(bg.id)} />
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.toolbar}>
              <Button title="Cut out 360°" icon="scissors" onPress={cutout360} style={styles.flex} />
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

function Swatch({ bg, active, onPress }: { bg: BackgroundPreset; active: boolean; onPress: () => void }) {
  const color =
    bg.kind === 'color' ? bg.color : bg.kind === 'gradient' ? bg.colors[0] : bg.kind === 'studio' ? bg.wall : '#FFFFFF';
  return (
    <PressableScale style={styles.swatchWrap} onPress={onPress} haptic="selection">
      <View style={[styles.swatch, active && styles.swatchActive, { backgroundColor: color }]}>
        {bg.kind === 'transparent' ? (
          <Text variant="body" color="#9A9AA5">
            ▨
          </Text>
        ) : null}
      </View>
      <Text variant="caption" faint={!active} numberOfLines={1}>
        {bg.name}
      </Text>
    </PressableScale>
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
  stripWrap: { paddingTop: spacing.md },
  strip: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  swatchWrap: { alignItems: 'center', gap: spacing.xs, width: 62 },
  swatch: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderColor: colors.primary },
  toolbar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  flex: { flex: 1 },
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
