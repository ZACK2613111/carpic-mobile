import { useCanvasRef } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Checkerboard } from '@/components/Checkerboard';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { NotFound } from '@/components/NotFound';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useBackgroundRemoval } from '@/features/background-removal/useBackgroundRemoval';
import { useBrand, watermarkVisible } from '@/features/branding/brand';
import { BackgroundStrip } from '@/features/editor/BackgroundStrip';
import { getBackground } from '@/features/editor/backgrounds';
import { computeAlphaBoundsFromUri } from '@/features/editor/cutoutBounds';
import { CoachMarks } from '@/features/editor/CoachMarks';
import { EngineAudio } from '@/features/editor/EngineAudio';
import { useEditorStore } from '@/features/editor/editorStore';
import { shadowEnabled } from '@/features/editor/groundShadow';
import { pickAndUploadHotspotPhoto } from '@/features/editor/hotspotPhoto';
import { HotspotSheet } from '@/features/editor/HotspotSheet';
import { NudgePad } from '@/features/editor/NudgePad';
import { defaultPlate } from '@/features/editor/plateMask';
import { PlateControls } from '@/features/editor/PlateControls';
import { StudioCanvas } from '@/features/editor/StudioCanvas';
import { useCanvasExport } from '@/features/editor/useCanvasExport';
import { useCanvasGestures } from '@/features/editor/useCanvasGestures';
import { useShotHydration } from '@/features/editor/useShotHydration';
import { getSlot } from '@/features/capture/shotTemplate';
import { uploadShotAsset } from '@/features/shots/shots.api';
import { useShot, useShotSignedUrl, useUpdateShot } from '@/features/shots/useShots';
import { haptics } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { captureException } from '@/lib/reporting';
import { useCoachMarks } from '@/lib/useCoachMarks';
import { useDebouncedAutosave } from '@/lib/useDebouncedAutosave';
import { useRouteId } from '@/lib/useRouteId';
import { colors, radius, shadow as elevation, spacing } from '@/theme';

const COACH_KEY = 'editor-coach-v1';

export default function EditorScreen() {
  const id = useRouteId();
  const router = useRouter();
  const canvasRef = useCanvasRef();
  const toast = useToast();
  const t = useT();
  const [reloadKey, setReloadKey] = useState(0);

  const { data: shot, isLoading: shotLoading, isError: shotError, refetch: refetchShot } = useShot(id ?? undefined);
  const updateShot = useUpdateShot();
  const { remove, status: bgStatus } = useBackgroundRemoval();

  // store bindings
  const storeProjectId = useEditorStore((s) => s.projectId);
  const hydrated = useEditorStore((s) => s.hydrated);
  const name = useEditorStore((s) => s.name);
  const mode = useEditorStore((s) => s.mode);
  const backgroundId = useEditorStore((s) => s.backgroundId);
  const originalUri = useEditorStore((s) => s.originalUri);
  const cutoutUri = useEditorStore((s) => s.cutoutUri);
  const hotspots = useEditorStore((s) => s.hotspots);
  const selectedId = useEditorStore((s) => s.selectedId);
  const shadow = useEditorStore((s) => s.shadow);
  const plate = useEditorStore((s) => s.plate);
  const plateSel = useEditorStore((s) => s.plateSelected);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);

  const setMode = useEditorStore((s) => s.setMode);
  const setBackground = useEditorStore((s) => s.setBackground);
  const setShadow = useEditorStore((s) => s.setShadow);
  const setPlate = useEditorStore((s) => s.setPlate);
  const selectPlate = useEditorStore((s) => s.selectPlate);
  const setCutout = useEditorStore((s) => s.setCutout);
  const setSelected = useEditorStore((s) => s.setSelected);
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const nudgeHotspot = useEditorStore((s) => s.nudgeHotspot);

  const selected = selectedId ? hotspots.find((h) => h.id === selectedId) ?? null : null;
  const removing = bgStatus === 'removing';
  const hasCutout = Boolean(cutoutUri);
  const isTransparent = backgroundId === 'transparent';
  const shadowOn = shadowEnabled(getBackground(backgroundId), shadow);
  const slot = getSlot(shot?.slot ?? '');
  const isEngine = Boolean(slot?.audio);
  const { data: audioUrl } = useShotSignedUrl(shot?.audio_path ?? null);
  const brand = useBrand();
  const watermark = watermarkVisible(brand) ? { text: brand.text, position: brand.position } : undefined;

  // ---- composition: hydration, coach marks, gestures, export ----
  useShotHydration(shot, reloadKey);
  // Retry a failed image load: reset the store (clears the cached null URLs) and
  // bump the reload key so hydration runs again — no more infinite spinner.
  const retryHydrate = useCallback(() => {
    useEditorStore.getState().reset();
    setReloadKey((k) => k + 1);
  }, []);
  const coach = useCoachMarks(COACH_KEY);
  const { canvasSize, onCanvasLayout, gesture, contentStyle, zoomed, resetZoom } = useCanvasGestures({
    editable: !removing && !coach.visible,
  });
  const { exporting, onExportPress } = useCanvasExport({ canvasRef, resetZoom });

  // ---- debounced autosave (shared hook: retry, follow-up saves, flush on leave) ----
  const { status: saveStatus } = useDebouncedAutosave({
    signature: JSON.stringify([backgroundId, hotspots, shadow, plate]),
    enabled: hydrated && storeProjectId === id,
    save: useCallback(async () => {
      const s = useEditorStore.getState();
      if (!id || s.projectId !== id) return;
      await updateShot.mutateAsync({
        id,
        patch: {
          background_id: s.backgroundId,
          doc: {
            version: 1,
            hotspots: s.hotspots,
            ...(s.shadow !== undefined ? { shadow: s.shadow } : {}),
            ...(s.plate ? { plate: s.plate } : {}),
            ...(s.bounds ? { bounds: s.bounds } : {}),
          },
        },
      });
      useEditorStore.getState().markSaved();
    }, [id, updateShot]),
  });

  // ---- actions ----
  const onCutout = useCallback(async () => {
    const s = useEditorStore.getState();
    if (!s.originalUri) {
      Alert.alert(t('editor.noPhotoTitle'), t('editor.noPhotoBody'));
      return;
    }
    try {
      const cut = await remove(s.originalUri);
      setCutout(cut);
      haptics.success();
      toast.show(t('editor.bgRemoved'), 'success');
      // Persist the cutout's alpha footprint so the published viewer can place
      // an accurate shadow/reflection (best-effort; the editor shadow is live).
      void computeAlphaBoundsFromUri(cut).then((b) => {
        if (b) useEditorStore.getState().setBounds(b.norm);
      });
      if (shot) {
        try {
          const path = await uploadShotAsset(shot.project_id, shot.slot, 'cutout', cut, 'image/png');
          await updateShot.mutateAsync({ id: shot.id, patch: { cutout_path: path } });
        } catch (uploadErr) {
          captureException(uploadErr, { context: 'cutout-upload' });
          toast.show(t('editor.cutoutSaveFailed'), 'error');
        }
      }
    } catch (e) {
      haptics.error();
      const msg = e instanceof Error ? e.message : t('editor.bgRemovalFailed');
      if (msg.includes('REQUIRES_API_FALLBACK')) {
        Alert.alert(t('editor.unsupportedTitle'), t('editor.unsupportedBody'));
      } else {
        Alert.alert(t('editor.cutoutFailedTitle'), msg);
      }
    }
  }, [remove, setCutout, toast, updateShot, shot, t]);

  const onEngineRecorded = useCallback(
    async (uri: string) => {
      if (!shot) return;
      try {
        const path = await uploadShotAsset(shot.project_id, shot.slot, 'audio', uri, 'audio/m4a');
        await updateShot.mutateAsync({ id: shot.id, patch: { audio_path: path } });
        toast.show(t('editor.engineSaved'), 'success');
      } catch (e) {
        toast.show(e instanceof Error ? e.message : t('editor.audioSaveFailed'), 'error');
      }
    },
    [shot, updateShot, toast, t]
  );

  const onPlateToggle = useCallback(() => {
    const s = useEditorStore.getState();
    if (s.plate) {
      haptics.medium();
      setPlate(undefined);
    } else {
      haptics.light();
      setPlate(defaultPlate());
      selectPlate(true);
    }
  }, [setPlate, selectPlate]);

  const saving = saveStatus === 'pending' || saveStatus === 'saving';

  // Bad/stale deep link or a deleted shot — recoverable dead-end beats an
  // infinite spinner. (All hooks above have already run, so this is safe.)
  if (!id || shotError || (!shotLoading && !shot)) {
    return (
      <NotFound
        title={t('editor.shotUnavailable')}
        subtitle={shotError ? t('editor.shotLoadFailed') : t('editor.shotGone')}
        onRetry={shotError ? () => void refetchShot() : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        <Text variant="heading" numberOfLines={1} style={styles.name}>
          {name || t('editor.shotFallback')}
        </Text>
        <IconButton
          name="undo"
          variant="ghost"
          accessibilityLabel={t('editor.undo')}
          onPress={() => useEditorStore.getState().undo()}
          disabled={!canUndo}
        />
        <IconButton
          name="redo"
          variant="ghost"
          accessibilityLabel={t('editor.redo')}
          onPress={() => useEditorStore.getState().redo()}
          disabled={!canRedo}
        />
      </View>

      {/* Mode + status */}
      <View style={styles.modeRow}>
        <SegmentedControl<'marketing' | 'inspection'>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'marketing', label: t('hotspot.marketing'), icon: 'sparkles' },
            { value: 'inspection', label: t('hotspot.inspection'), icon: 'wrench' },
          ]}
        />
      </View>
      <View style={styles.infoRow}>
        <Text variant="caption" faint>
          {t(hotspots.length === 1 ? 'editor.hotspotsOne' : 'editor.hotspotsMany', { n: hotspots.length })}
        </Text>
        <Text
          variant="caption"
          color={saveStatus === 'failed' ? colors.danger : saving ? colors.warning : colors.textMuted}
        >
          {saveStatus === 'failed' ? t('editor.saveFailed') : saving ? t('editor.saving') : t('editor.saved')}
        </Text>
      </View>

      {/* Canvas */}
      <GestureDetector gesture={gesture}>
        <View style={styles.canvasArea} onLayout={onCanvasLayout}>
          {canvasSize.width > 0 ? (
            <Animated.View style={[styles.canvasContent, contentStyle]}>
              {isTransparent ? (
                <View style={StyleSheet.absoluteFill}>
                  <Checkerboard width={canvasSize.width} height={canvasSize.height} />
                </View>
              ) : null}
              <StudioCanvas
                width={canvasSize.width}
                height={canvasSize.height}
                canvasRef={canvasRef}
                originalUri={originalUri}
                cutoutUri={cutoutUri}
                backgroundId={backgroundId}
                hotspots={hotspots}
                selectedId={selectedId}
                shadow={shadow}
                plate={plate}
                plateSelected={plateSel}
                watermark={watermark}
              />
            </Animated.View>
          ) : null}

          {zoomed ? (
            <View style={styles.zoomReset}>
              <IconButton name="zoomIn" variant="surface" size={40} accessibilityLabel={t('editor.resetZoom')} onPress={resetZoom} />
            </View>
          ) : null}

          {selected ? (
            <View style={styles.nudge} pointerEvents="box-none">
              <NudgePad
                onNudge={(dx, dy) => {
                  haptics.selection();
                  nudgeHotspot(selected.id, dx, dy);
                }}
              />
            </View>
          ) : null}

          {originalUri && hotspots.length === 0 && !zoomed && !removing ? (
            <View style={styles.tapHint} pointerEvents="none">
              <Text variant="caption" muted>
                {t('editor.tapHint')}
              </Text>
            </View>
          ) : null}

          {!originalUri ? (
            hydrated ? (
              // Hydration finished but the signed photo URL never resolved
              // (transient storage/network error) — offer a retry, not a hang.
              <View style={styles.loadError}>
                <Text variant="body" muted center>
                  {t('editor.photoLoadFailed')}
                </Text>
                <Button title={t('common.retry')} icon="refresh" variant="secondary" onPress={retryHydrate} />
              </View>
            ) : (
              <View style={styles.centerOverlay} pointerEvents="none">
                <ActivityIndicator color={colors.primary} />
              </View>
            )
          ) : null}

          {removing ? (
            <View style={styles.progress}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text variant="bodyStrong">{t('editor.removingBg')}</Text>
              <Text variant="caption" muted>
                {t('editor.onDevice')}
              </Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      {/* Toggles: ground shadow (cutout on a surface only) + license-plate mask */}
      {originalUri ? (
        <View style={styles.toggleRow}>
          {hasCutout && !isTransparent ? (
            <ToggleChip
              icon="sparkles"
              label={`${t('editor.shadow')} ${shadowOn ? t('common.on') : t('common.off')}`}
              active={shadowOn}
              onPress={() => {
                haptics.selection();
                setShadow(!shadowOn);
              }}
            />
          ) : null}
          <ToggleChip
            icon="crosshair"
            label={plate ? t('editor.plateMasked') : t('editor.plateMask')}
            active={Boolean(plate)}
            onPress={onPlateToggle}
          />
        </View>
      ) : null}

      {plate && plateSel ? <PlateControls plate={plate} /> : null}

      <BackgroundStrip activeId={backgroundId} onSelect={setBackground} />

      {isEngine ? (
        <View style={styles.engineRow}>
          <EngineAudio audioUrl={audioUrl ?? null} onRecorded={onEngineRecorded} />
        </View>
      ) : null}

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Button
          title={hasCutout ? t('editor.reCut') : t('editor.cutOut')}
          icon="scissors"
          onPress={onCutout}
          loading={removing}
          style={styles.flex}
        />
        <Button
          title={t('editor.export')}
          icon="share"
          variant="secondary"
          onPress={onExportPress}
          loading={exporting}
          disabled={!hasCutout && !originalUri}
          style={styles.flex}
        />
      </View>

      <HotspotSheet
        hotspot={selected}
        onChange={(patch) => selected && updateHotspot(selected.id, patch)}
        onPickPhoto={
          selected && shot
            ? () => pickAndUploadHotspotPhoto(shot.project_id, `${shot.slot}-${selected.id}`)
            : undefined
        }
        onDelete={() => {
          if (selected) {
            haptics.medium();
            removeHotspot(selected.id);
          }
        }}
        onClose={() => setSelected(null)}
      />

      {coach.visible ? <CoachMarks onDismiss={coach.dismiss} /> : null}
    </SafeAreaView>
  );
}

function ToggleChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: 'sparkles' | 'crosshair';
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale style={[styles.toggleChip, active ? styles.toggleChipOn : null]} onPress={onPress}>
      <Icon name={icon} size={16} color={active ? colors.primary : colors.textMuted} />
      <Text variant="label" color={active ? colors.primary : colors.textMuted}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  name: { flex: 1, textAlign: 'center' },
  modeRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  canvasArea: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  canvasContent: { flex: 1 },
  centerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  loadError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  zoomReset: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  nudge: { position: 'absolute', left: spacing.sm, bottom: spacing.sm },
  tapHint: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    ...elevation.sm,
  },
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

  engineRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  toolbar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  flex: { flex: 1 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  toggleChip: {
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
  toggleChipOn: { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
});
