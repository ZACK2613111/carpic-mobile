import { useCanvasRef } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
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
  useShotHydration(shot);
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
      Alert.alert('No photo', 'Add a car photo first.');
      return;
    }
    try {
      const cut = await remove(s.originalUri);
      setCutout(cut);
      haptics.success();
      toast.show('Background removed', 'success');
      if (shot) {
        try {
          const path = await uploadShotAsset(shot.project_id, shot.slot, 'cutout', cut, 'image/png');
          await updateShot.mutateAsync({ id: shot.id, patch: { cutout_path: path } });
        } catch (uploadErr) {
          console.warn('[editor] cutout upload failed', uploadErr);
        }
      }
    } catch (e) {
      haptics.error();
      const msg = e instanceof Error ? e.message : 'Background removal failed';
      if (msg.includes('REQUIRES_API_FALLBACK')) {
        Alert.alert('Unsupported device', 'On-device cutout needs iOS 17+ (or an Android device with ML Kit).');
      } else {
        Alert.alert('Cut out failed', msg);
      }
    }
  }, [remove, setCutout, toast, updateShot, shot]);

  const onEngineRecorded = useCallback(
    async (uri: string) => {
      if (!shot) return;
      try {
        const path = await uploadShotAsset(shot.project_id, shot.slot, 'audio', uri, 'audio/m4a');
        await updateShot.mutateAsync({ id: shot.id, patch: { audio_path: path } });
        toast.show('Engine sound saved', 'success');
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'Could not save audio', 'error');
      }
    },
    [shot, updateShot, toast]
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
        title="Shot unavailable"
        subtitle={shotError ? "This shot couldn't be loaded." : 'This shot no longer exists.'}
        onRetry={shotError ? () => void refetchShot() : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text variant="heading" numberOfLines={1} style={styles.name}>
          {name || 'Shot'}
        </Text>
        <IconButton
          name="undo"
          variant="ghost"
          accessibilityLabel="Undo"
          onPress={() => useEditorStore.getState().undo()}
          disabled={!canUndo}
        />
        <IconButton
          name="redo"
          variant="ghost"
          accessibilityLabel="Redo"
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
            { value: 'marketing', label: 'Marketing', icon: 'sparkles' },
            { value: 'inspection', label: 'Inspection', icon: 'wrench' },
          ]}
        />
      </View>
      <View style={styles.infoRow}>
        <Text variant="caption" faint>
          {hotspots.length} hotspot{hotspots.length === 1 ? '' : 's'}
        </Text>
        <Text
          variant="caption"
          color={saveStatus === 'failed' ? colors.danger : saving ? colors.warning : colors.textMuted}
        >
          {saveStatus === 'failed' ? 'Save failed — retrying…' : saving ? 'Saving…' : 'Saved'}
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
              <IconButton name="zoomIn" variant="surface" size={40} accessibilityLabel="Reset zoom" onPress={resetZoom} />
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
                Tap the car to add a hotspot
              </Text>
            </View>
          ) : null}

          {!originalUri ? (
            <View style={styles.centerOverlay} pointerEvents="none">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}

          {removing ? (
            <View style={styles.progress}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text variant="bodyStrong">Removing background…</Text>
              <Text variant="caption" muted>
                Running on your device
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
              label={`Shadow ${shadowOn ? 'on' : 'off'}`}
              active={shadowOn}
              onPress={() => {
                haptics.selection();
                setShadow(!shadowOn);
              }}
            />
          ) : null}
          <ToggleChip
            icon="crosshair"
            label={plate ? 'Plate masked' : 'Plate mask'}
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
          title={hasCutout ? 'Re-cut' : 'Cut out'}
          icon="scissors"
          onPress={onCutout}
          loading={removing}
          style={styles.flex}
        />
        <Button
          title="Export"
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
