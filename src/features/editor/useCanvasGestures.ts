import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useEditorStore } from './editorStore';
import { hitPlate } from './plateMask';

// Touch radius for pins and the plate's resize handle, in screen px (divided by
// the zoom scale so hit areas stay finger-sized while zoomed in).
const HIT_R = 26;
const MAX_ZOOM = 4;

/**
 * Everything touch on the editor canvas: pinch-zoom + two-finger pan (worklets),
 * single-finger tap/drag for pins and the plate mask (runOnJS — they mutate the
 * store), plus the viewport→normalized mapping that makes all of it zoom-aware.
 * The screen composes the result; all state changes go through the editor store.
 */
export function useCanvasGestures({ editable }: { editable: boolean }) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [zoomed, setZoomed] = useState(false);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const dragId = useSharedValue<string | null>(null);
  const plateDrag = useSharedValue<'move' | 'resize' | null>(null);

  // ---- viewport -> normalized canvas coords, inverse of the zoom transform ----
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

  const findPlateHit = useCallback(
    (nx: number, ny: number) => {
      const s = useEditorStore.getState();
      if (!s.plate) return null;
      const W = canvasSize.width || 1;
      const H = canvasSize.height || 1;
      return hitPlate(s.plate, nx, ny, W, H, HIT_R / scale.value);
    },
    [canvasSize, scale]
  );

  // ---- gestures ----
  const tap = Gesture.Tap()
    .maxDuration(260)
    .enabled(editable)
    .runOnJS(true)
    .onEnd((e) => {
      const { nx, ny } = toNorm(e.x, e.y);
      const s = useEditorStore.getState();
      const pinId = findHit(nx, ny);
      if (pinId) {
        haptics.selection();
        s.setSelected(pinId);
        return;
      }
      if (findPlateHit(nx, ny)) {
        haptics.selection();
        s.selectPlate(true);
        return;
      }
      if (s.plateSelected) {
        // First tap outside a selected plate dismisses it instead of dropping a pin.
        s.selectPlate(false);
        return;
      }
      s.addHotspot(nx, ny);
      haptics.light();
    });

  const panPin = Gesture.Pan()
    .maxPointers(1)
    .minDistance(6)
    .enabled(editable)
    .runOnJS(true)
    .onStart((e) => {
      const { nx, ny } = toNorm(e.x, e.y);
      const s = useEditorStore.getState();
      const pinId = findHit(nx, ny);
      dragId.value = pinId;
      plateDrag.value = null;
      if (pinId) {
        s.beginInteraction();
        s.setSelected(pinId);
        return;
      }
      const hit = findPlateHit(nx, ny);
      if (hit) {
        plateDrag.value = hit === 'resize' ? 'resize' : 'move';
        s.beginInteraction();
        s.selectPlate(true);
      }
    })
    .onUpdate((e) => {
      const { nx, ny } = toNorm(e.x, e.y);
      if (dragId.value) {
        useEditorStore.getState().moveHotspot(dragId.value, nx, ny);
      } else if (plateDrag.value === 'move') {
        useEditorStore.getState().movePlateTo(nx, ny);
      } else if (plateDrag.value === 'resize') {
        useEditorStore.getState().resizePlateTo(nx, ny);
      }
    })
    .onEnd(() => {
      dragId.value = null;
      plateDrag.value = null;
    });

  const pinch = Gesture.Pinch()
    .enabled(editable)
    .onStart(() => {
      'worklet';
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      'worklet';
      scale.value = Math.min(MAX_ZOOM, Math.max(1, startScale.value * e.scale));
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

  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize((prev) =>
      Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1 ? { width, height } : prev
    );
  }, []);

  return { canvasSize, onCanvasLayout, gesture, contentStyle, zoomed, resetZoom };
}
