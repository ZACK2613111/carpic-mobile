import { useCanvasRef } from '@shopify/react-native-skia';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, type LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Checkerboard } from '@/components/Checkerboard';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useBackgroundRemoval } from '@/features/background-removal/useBackgroundRemoval';
import { BACKGROUND_PRESETS, type BackgroundPreset } from '@/features/editor/backgrounds';
import { CoachMarks } from '@/features/editor/CoachMarks';
import { EngineAudio } from '@/features/editor/EngineAudio';
import { useEditorStore } from '@/features/editor/editorStore';
import { exportCanvas } from '@/features/editor/exportImage';
import { HotspotSheet } from '@/features/editor/HotspotSheet';
import { StudioCanvas } from '@/features/editor/StudioCanvas';
import { getSlot } from '@/features/capture/shotTemplate';
import { shotSignedUrl, uploadShotAsset } from '@/features/shots/shots.api';
import { useShot, useShotSignedUrl, useUpdateShot } from '@/features/shots/useShots';
import { haptics } from '@/lib/haptics';
import { hasSeen, markSeen } from '@/lib/onboarding';
import { colors, radius, spacing } from '@/theme';

const HIT_R = 26;
const NUDGE = 0.004;
const COACH_KEY = 'editor-coach-v1';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const canvasRef = useCanvasRef();
  const toast = useToast();

  const { data: shot } = useShot(id);
  const updateShot = useUpdateShot();
  const { remove, status: bgStatus } = useBackgroundRemoval();

  // store bindings
  const load = useEditorStore((s) => s.load);
  const storeProjectId = useEditorStore((s) => s.projectId);
  const hydrated = useEditorStore((s) => s.hydrated);
  const name = useEditorStore((s) => s.name);
  const mode = useEditorStore((s) => s.mode);
  const backgroundId = useEditorStore((s) => s.backgroundId);
  const originalUri = useEditorStore((s) => s.originalUri);
  const cutoutUri = useEditorStore((s) => s.cutoutUri);
  const hotspots = useEditorStore((s) => s.hotspots);
  const selectedId = useEditorStore((s) => s.selectedId);
  const dirty = useEditorStore((s) => s.dirty);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);

  const setMode = useEditorStore((s) => s.setMode);
  const setBackground = useEditorStore((s) => s.setBackground);
  const setCutout = useEditorStore((s) => s.setCutout);
  const setSelected = useEditorStore((s) => s.setSelected);
  const updateHotspot = useEditorStore((s) => s.updateHotspot);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const nudgeHotspot = useEditorStore((s) => s.nudgeHotspot);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [exporting, setExporting] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const hydratedRef = useRef<string | null>(null);

  const selected = selectedId ? hotspots.find((h) => h.id === selectedId) ?? null : null;
  const removing = bgStatus === 'removing';
  const hasCutout = Boolean(cutoutUri);
  const isTransparent = backgroundId === 'transparent';
  const slot = getSlot(shot?.slot ?? '');
  const isEngine = Boolean(slot?.audio);
  const { data: audioUrl } = useShotSignedUrl(shot?.audio_path ?? null);

  // zoom/pan shared values
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const dragId = useSharedValue<string | null>(null);

  // ---- hydration (the editor targets a single shot) ----
  useEffect(() => {
    if (!shot || !id) return;
    if (storeProjectId === shot.id && hydrated) {
      hydratedRef.current = shot.id;
      return;
    }
    if (hydratedRef.current === shot.id) return;
    hydratedRef.current = shot.id;

    (async () => {
      const [orig, cut] = await Promise.all([
        shotSignedUrl(shot.image_path),
        shotSignedUrl(shot.cutout_path),
      ]);
      load({
        projectId: shot.id,
        name: getSlot(shot.slot)?.label ?? 'Shot',
        mode: 'marketing',
        backgroundId: shot.background_id,
        originalUri: orig,
        cutoutUri: cut,
        hotspots: shot.doc?.hotspots ?? [],
      });
    })();
  }, [shot, id, storeProjectId, hydrated, load]);

  // ---- coach marks (first run) ----
  useEffect(() => {
    hasSeen(COACH_KEY).then((seen) => {
      if (!seen) setShowCoach(true);
    });
  }, []);

  const dismissCoach = useCallback(() => {
    setShowCoach(false);
    markSeen(COACH_KEY);
  }, []);

  // ---- debounced autosave ----
  const saveNow = useCallback(async () => {
    const s = useEditorStore.getState();
    if (!id || s.projectId !== id) return;
    const sig = JSON.stringify([s.backgroundId, s.hotspots]);
    try {
      await updateShot.mutateAsync({
        id,
        patch: {
          background_id: s.backgroundId,
          doc: { version: 1, hotspots: s.hotspots },
        },
      });
      // Only clear the dirty flag if nothing changed while we were saving.
      // Compare by value — the store creates new arrays on every edit, so a
      // reference check would (almost) never match and leave "Saving…" stuck.
      const after = useEditorStore.getState();
      const afterSig = JSON.stringify([after.backgroundId, after.hotspots]);
      if (after.projectId === id && afterSig === sig) {
        useEditorStore.getState().markSaved();
      }
    } catch (e) {
      console.warn('[editor] autosave failed', e);
    }
  }, [id, updateShot]);

  const saveNowRef = useRef(saveNow);
  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  useEffect(() => {
    const timer = { current: null as ReturnType<typeof setTimeout> | null };
    const unsub = useEditorStore.subscribe(() => {
      const s = useEditorStore.getState();
      if (s.projectId !== id || !s.dirty) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => saveNowRef.current(), 1200);
    });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      unsub();
    };
  }, [id]);

  // ---- coordinate mapping (viewport -> normalized canvas), accounts for zoom ----
  const toNorm = useCallback(
    (x: number, y: number) => {
      const W = canvasSize.width || 1;
      const H = canvasSize.height || 1;
      const cx = (x - W / 2 - tx.value) / scale.value + W / 2;
      const cy = (y - H / 2 - ty.value) / scale.value + H / 2;
      return { nx: cx / W, ny: cy / H };
    },
    [canvasSize, tx, ty, scale]
  );

  const findHit = useCallback(
    (nx: number, ny: number): string | null => {
      const W = canvasSize.width || 1;
      const H = canvasSize.height || 1;
      const hs = useEditorStore.getState().hotspots;
      const r = HIT_R / scale.value;
      for (let i = hs.length - 1; i >= 0; i--) {
        const dx = (nx - hs[i].x) * W;
        const dy = (ny - hs[i].y) * H;
        if (dx * dx + dy * dy <= r * r * scale.value * scale.value) return hs[i].id;
      }
      return null;
    },
    [canvasSize, scale]
  );

  // ---- gestures ----
  const editable = !removing && !showCoach;

  const tap = Gesture.Tap()
    .maxDuration(260)
    .enabled(editable)
    .runOnJS(true)
    .onEnd((e) => {
      const { nx, ny } = toNorm(e.x, e.y);
      const id2 = findHit(nx, ny);
      if (id2) {
        haptics.selection();
        setSelected(id2);
      } else {
        useEditorStore.getState().addHotspot(nx, ny);
        haptics.light();
      }
    });

  const panPin = Gesture.Pan()
    .maxPointers(1)
    .minDistance(6)
    .enabled(editable)
    .runOnJS(true)
    .onStart((e) => {
      const { nx, ny } = toNorm(e.x, e.y);
      const id2 = findHit(nx, ny);
      dragId.value = id2;
      if (id2) {
        useEditorStore.getState().beginInteraction();
        setSelected(id2);
      }
    })
    .onUpdate((e) => {
      if (dragId.value) {
        const { nx, ny } = toNorm(e.x, e.y);
        useEditorStore.getState().moveHotspot(dragId.value, nx, ny);
      }
    })
    .onEnd(() => {
      dragId.value = null;
    });

  const pinch = Gesture.Pinch()
    .enabled(editable)
    .onStart(() => {
      'worklet';
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      'worklet';
      scale.value = Math.min(4, Math.max(1, startScale.value * e.scale));
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.01) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        runOnJS(setZoomed)(false);
      } else {
        runOnJS(setZoomed)(true);
      }
    });

  const panView = Gesture.Pan()
    .minPointers(2)
    .enabled(editable)
    .onStart(() => {
      'worklet';
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      'worklet';
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const gesture = Gesture.Simultaneous(Gesture.Race(panPin, tap), pinch, panView);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    setZoomed(false);
  }, [scale, tx, ty]);

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
          await updateShot.mutateAsync({ id, patch: { cutout_path: path } });
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
  }, [id, remove, setCutout, toast, updateShot, shot]);

  const doExport = useCallback(
    async (target: 'share' | 'save') => {
      setExporting(true);
      setSelected(null); // hide crosshair from the exported image
      resetZoom(); // export captures the full composition at 1:1, so match the view
      try {
        // give the canvas a frame to re-render without the crosshair
        await new Promise((r) => setTimeout(r, 80));
        const uri = await exportCanvas(canvasRef, 'png');
        if (target === 'share') {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
          } else {
            toast.show('Sharing not available', 'error');
          }
        } else {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Allow photo access to save the image.');
            return;
          }
          await MediaLibrary.saveToLibraryAsync(uri);
          haptics.success();
          toast.show('Saved to Photos', 'success');
        }
      } catch (e) {
        Alert.alert('Export failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setExporting(false);
      }
    },
    [canvasRef, resetZoom, setSelected, toast]
  );

  const onExportPress = useCallback(() => {
    if (!hasCutout && !originalUri) return;
    Alert.alert('Export image', 'How would you like to export?', [
      { text: 'Share', onPress: () => doExport('share') },
      { text: 'Save to Photos', onPress: () => doExport('save') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [doExport, hasCutout, originalUri]);

  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize((prev) =>
      Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1 ? { width, height } : prev
    );
  }, []);

  const onEngineRecorded = useCallback(
    async (uri: string) => {
      if (!shot) return;
      try {
        const path = await uploadShotAsset(shot.project_id, shot.slot, 'audio', uri, 'audio/m4a');
        await updateShot.mutateAsync({ id, patch: { audio_path: path } });
        toast.show('Engine sound saved', 'success');
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'Could not save audio', 'error');
      }
    },
    [shot, id, updateShot, toast]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text numberOfLines={1} style={styles.nameInput}>
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
        <Text variant="caption" color={dirty ? colors.warning : colors.textMuted}>
          {dirty ? 'Saving…' : 'Saved'}
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
              />
            </Animated.View>
          ) : null}

          {/* zoom reset */}
          {zoomed ? (
            <View style={styles.zoomReset}>
              <IconButton name="zoomIn" variant="surface" size={40} accessibilityLabel="Reset zoom" onPress={resetZoom} />
            </View>
          ) : null}

          {/* nudge d-pad for the selected hotspot */}
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

          {/* tap hint */}
          {originalUri && hotspots.length === 0 && !zoomed && !removing ? (
            <View style={styles.tapHint} pointerEvents="none">
              <Text variant="caption" style={styles.tapHintText}>
                Tap the car to add a hotspot
              </Text>
            </View>
          ) : null}

          {/* loading state */}
          {!originalUri ? (
            <View style={styles.centerOverlay} pointerEvents="none">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}

          {/* cut-out progress */}
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

      {/* Background strip */}
      <View style={styles.stripWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {BACKGROUND_PRESETS.map((bg) => (
            <Swatch key={bg.id} bg={bg} active={bg.id === backgroundId} onPress={() => setBackground(bg.id)} />
          ))}
        </ScrollView>
      </View>

      {/* Engine sound (engine shot only) */}
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
        onDelete={() => {
          if (selected) {
            haptics.medium();
            removeHotspot(selected.id);
          }
        }}
        onClose={() => setSelected(null)}
      />

      {showCoach ? <CoachMarks onDismiss={dismissCoach} /> : null}
    </SafeAreaView>
  );
}

function NudgePad({ onNudge }: { onNudge: (dx: number, dy: number) => void }) {
  return (
    <View style={styles.nudgePad}>
      <View style={styles.nudgeRow}>
        <IconButton name="up" size={38} accessibilityLabel="Move up" onPress={() => onNudge(0, -NUDGE)} />
      </View>
      <View style={styles.nudgeRow}>
        <IconButton name="back" size={38} accessibilityLabel="Move left" onPress={() => onNudge(-NUDGE, 0)} />
        <View style={styles.nudgeCenter}>
          <Icon name="crosshair" size={16} color={colors.textFaint} />
        </View>
        <IconButton name="forward" size={38} accessibilityLabel="Move right" onPress={() => onNudge(NUDGE, 0)} />
      </View>
      <View style={styles.nudgeRow}>
        <IconButton name="down" size={38} accessibilityLabel="Move down" onPress={() => onNudge(0, NUDGE)} />
      </View>
    </View>
  );
}

function Swatch({ bg, active, onPress }: { bg: BackgroundPreset; active: boolean; onPress: () => void }) {
  return (
    <PressableScale style={styles.swatchWrap} onPress={onPress} haptic="selection">
      <View
        style={[
          styles.swatch,
          active && styles.swatchActive,
          bg.kind === 'transparent' ? styles.swatchTransparent : { backgroundColor: previewColor(bg) },
        ]}
      >
        {bg.kind === 'transparent' ? (
          <Text variant="body" color="#9A9AA5">
            ▨
          </Text>
        ) : null}
      </View>
      <Text variant="caption" faint={!active} color={active ? colors.text : undefined} numberOfLines={1}>
        {bg.name}
      </Text>
    </PressableScale>
  );
}

function previewColor(bg: BackgroundPreset): string {
  switch (bg.kind) {
    case 'color':
      return bg.color;
    case 'gradient':
      return bg.colors[0];
    case 'studio':
      return bg.wall;
    default:
      return colors.surfaceAlt;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  nameInput: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
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
  nudgePad: { alignItems: 'center', backgroundColor: `${colors.bg}CC`, borderRadius: radius.md, padding: spacing.xs },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nudgeCenter: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  tapHint: { position: 'absolute', bottom: spacing.md, alignSelf: 'center' },
  tapHintText: {
    color: colors.text,
    backgroundColor: colors.scrim,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
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
  swatchTransparent: { backgroundColor: '#FFFFFF' },

  engineRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  toolbar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  flex: { flex: 1 },
});
