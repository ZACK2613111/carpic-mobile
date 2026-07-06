import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';
import type { GuideId } from './shotTemplate';

// Where to stand relative to the car (drawn front-up) for each exterior angle.
const EXTERIOR_DOT: Partial<Record<GuideId, { x: number; y: number }>> = {
  front: { x: 0.5, y: 0.08 },
  front34r: { x: 0.85, y: 0.2 },
  sideR: { x: 0.92, y: 0.5 },
  rear34r: { x: 0.85, y: 0.8 },
  rear: { x: 0.5, y: 0.92 },
  rear34l: { x: 0.15, y: 0.8 },
  sideL: { x: 0.08, y: 0.5 },
  front34l: { x: 0.15, y: 0.2 },
};

const HINTS: Partial<Record<GuideId, string>> = {
  wheel: 'Fill the frame with the wheel',
  detail: 'Get close and keep it sharp',
  interior: 'Hold steady, wide framing',
  engine: 'Open the bonnet, then record the sound',
};

export function GuideOverlay({ guide, label }: { guide: GuideId; label: string }) {
  const dot = EXTERIOR_DOT[guide];
  const hint = HINTS[guide];

  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={[styles.bracket, styles.tl]} />
      <View style={[styles.bracket, styles.tr]} />
      <View style={[styles.bracket, styles.bl]} />
      <View style={[styles.bracket, styles.br]} />

      <View style={styles.labelWrap}>
        <Text variant="bodyStrong" color="#FFFFFF">
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="rgba(255,255,255,0.85)" center>
            {hint}
          </Text>
        ) : null}
      </View>

      {dot ? <PositionMap dot={dot} /> : null}
    </View>
  );
}

function PositionMap({ dot }: { dot: { x: number; y: number } }) {
  const S = 96;
  const pad = 16;
  const carW = 30;
  const carH = 54;
  return (
    <View style={styles.mapWrap}>
      <Svg width={S} height={S}>
        <Rect
          x={(S - carW) / 2}
          y={(S - carH) / 2}
          width={carW}
          height={carH}
          rx={8}
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={2}
        />
        <Rect
          x={(S - carW) / 2 + 5}
          y={(S - carH) / 2 + 7}
          width={carW - 10}
          height={9}
          rx={3}
          fill="rgba(255,255,255,0.3)"
        />
        <Circle
          cx={pad + dot.x * (S - 2 * pad)}
          cy={pad + dot.y * (S - 2 * pad)}
          r={7}
          fill={colors.primary}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      </Svg>
      <Text variant="caption" color="#FFFFFF" center>
        Stand here
      </Text>
    </View>
  );
}

const B = 30;
const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: spacing.lg },
  bracket: { position: 'absolute', width: B, height: B, borderColor: 'rgba(255,255,255,0.85)' },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  labelWrap: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.scrim,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    maxWidth: '80%',
  },
  mapWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.scrim,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
});
