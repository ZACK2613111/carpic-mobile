import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Text } from '@/components/Text';
import { getBackground } from '@/features/editor/backgrounds';
import type { SpinHotspot } from '@/features/projects/types';
import { colors, hotspotColor, radius, spacing } from '@/theme';

const PIN_R = 14;
const HIT = 26;

type Props = {
  frameUrls: (string | null)[];
  cutout?: boolean;
  backgroundId?: string;
  hotspots: SpinHotspot[];
  selectedId?: string | null;
  editable?: boolean;
  onAddHotspot?: (frame: number, x: number, y: number) => void;
  onMoveHotspot?: (id: string, x: number, y: number) => void;
  onSelectHotspot?: (id: string | null) => void;
};

export function SpinViewer({
  frameUrls,
  cutout = false,
  backgroundId = 'transparent',
  hotspots,
  selectedId,
  editable = false,
  onAddHotspot,
  onMoveHotspot,
  onSelectHotspot,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [index, setIndex] = useState(0);
  const startIndex = useRef(0);
  const dragPin = useRef<string | null>(null);
  const n = frameUrls.length;

  useEffect(() => {
    frameUrls.forEach((u) => {
      if (u) Image.prefetch(u);
    });
  }, [frameUrls]);

  const wrap = (i: number) => (n ? ((i % n) + n) % n : 0);
  const step = size.w > 0 && n > 0 ? size.w / n : 1; // one full drag ≈ one full turn
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const findHit = (nx: number, ny: number): string | null => {
    for (let i = hotspots.length - 1; i >= 0; i--) {
      const h = hotspots[i];
      if (h.frame !== index) continue;
      const dx = (nx - h.x) * size.w;
      const dy = (ny - h.y) * size.h;
      if (dx * dx + dy * dy <= HIT * HIT) return h.id;
    }
    return null;
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(3)
    .onStart((e) => {
      startIndex.current = index;
      dragPin.current = null;
      if (editable && size.w > 0) {
        const id = findHit(e.x / size.w, e.y / size.h);
        dragPin.current = id;
        if (id) onSelectHotspot?.(id);
      }
    })
    .onUpdate((e) => {
      if (editable && dragPin.current && size.w > 0) {
        onMoveHotspot?.(dragPin.current, clamp01(e.x / size.w), clamp01(e.y / size.h));
      } else {
        setIndex(wrap(startIndex.current - Math.round(e.translationX / step)));
      }
    })
    .onEnd(() => {
      dragPin.current = null;
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      if (!editable || size.w === 0) return;
      const nx = e.x / size.w;
      const ny = e.y / size.h;
      const id = findHit(nx, ny);
      if (id) onSelectHotspot?.(id);
      else onAddHotspot?.(index, clamp01(nx), clamp01(ny));
    });

  const gesture = Gesture.Exclusive(pan, tap);
  const current = frameUrls[index] ?? null;
  const framePins = hotspots.filter((h) => h.frame === index);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.wrap}
        onLayout={(e: LayoutChangeEvent) => {
          const { width, height } = e.nativeEvent.layout;
          setSize((p) => (Math.abs(p.w - width) > 1 || Math.abs(p.h - height) > 1 ? { w: width, h: height } : p));
        }}
      >
        {cutout ? <SpinBackground bg={backgroundId} /> : null}

        {current ? (
          <Image source={{ uri: current }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.center}>
            <Text variant="caption" muted>
              No 360 frames yet
            </Text>
          </View>
        )}

        {framePins.map((h) => {
          const num = hotspots.findIndex((x) => x.id === h.id) + 1;
          const selected = h.id === selectedId;
          return (
            <View
              key={h.id}
              pointerEvents="none"
              style={[
                styles.pin,
                {
                  left: h.x * size.w - PIN_R,
                  top: h.y * size.h - PIN_R,
                  backgroundColor: hotspotColor(h.kind, h.severity),
                  borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                },
              ]}
            >
              <Text variant="label" color="#FFFFFF">
                {num}
              </Text>
            </View>
          );
        })}

        {n > 0 ? (
          <View style={styles.hint} pointerEvents="none">
            <Text variant="caption" color="#FFFFFF">
              ↔ Drag to rotate · {index + 1}/{n}
            </Text>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

function SpinBackground({ bg }: { bg: string }) {
  const preset = getBackground(bg);
  if (preset.kind === 'color') return <View style={[StyleSheet.absoluteFill, { backgroundColor: preset.color }]} />;
  if (preset.kind === 'gradient') {
    return (
      <LinearGradient
        colors={preset.colors as [string, string]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    );
  }
  if (preset.kind === 'studio') {
    return (
      <LinearGradient
        colors={[preset.wall, preset.floor] as [string, string]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceAlt }]} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pin: {
    position: 'absolute',
    width: PIN_R * 2,
    height: PIN_R * 2,
    borderRadius: PIN_R,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    backgroundColor: colors.scrim,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
