import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';
import type { LevelStatus } from './level';
import { getSilhouette, type GuideShape } from './silhouettes';
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

const LEVEL_GREEN = '#34D399'; // brighter than colors.success for legibility on the dark viewfinder
const MAX_TILT = 22; // clamp the visual horizon rotation so it never overflows the frame

type Props = {
  guide: GuideId;
  label: string;
  grid?: boolean;
  showLevel?: boolean;
  levelStatus?: LevelStatus;
  roll?: SharedValue<number>;
};

export function GuideOverlay({ guide, label, grid, showLevel, levelStatus = 'off', roll }: Props) {
  const dot = EXTERIOR_DOT[guide];
  const sil = getSilhouette(guide);

  return (
    <View style={styles.fill} pointerEvents="none">
      {grid ? <ThirdsGrid /> : null}

      <SilhouetteView shape={sil.shape} />

      {showLevel && roll ? <HorizonLine roll={roll} status={levelStatus} /> : null}

      <View style={[styles.bracket, styles.tl]} />
      <View style={[styles.bracket, styles.tr]} />
      <View style={[styles.bracket, styles.bl]} />
      <View style={[styles.bracket, styles.br]} />

      <View style={styles.labelWrap}>
        <Text variant="bodyStrong" color="#FFFFFF">
          {label}
        </Text>
        <Text variant="caption" color="rgba(255,255,255,0.85)" center>
          {sil.label} · {sil.labelFr}
        </Text>
      </View>

      {showLevel && roll ? <LevelPill status={levelStatus} /> : null}

      {dot ? <PositionMap dot={dot} /> : null}
    </View>
  );
}

function ThirdsGrid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.gridLine, styles.gridV, { left: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridV, { left: '66.66%' }]} />
      <View style={[styles.gridLine, styles.gridH, { top: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridH, { top: '66.66%' }]} />
    </View>
  );
}

function SilhouetteView({ shape }: { shape: GuideShape }) {
  const { width: screenW } = useWindowDimensions();
  const stroke = 'rgba(255,255,255,0.62)';
  const fill = 'rgba(255,255,255,0.04)';

  if (shape.kind === 'path') {
    const [, , vbW, vbH] = shape.viewBox.split(' ').map(Number);
    const w = Math.min(screenW * 0.74, 460);
    const h = (w * vbH) / vbW;
    return (
      <View style={styles.center} pointerEvents="none">
        <View style={shape.flip ? styles.flip : undefined}>
          <Svg width={w} height={h} viewBox={shape.viewBox}>
            <Path d={shape.path} fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
          </Svg>
        </View>
      </View>
    );
  }

  if (shape.kind === 'circle') {
    const d = Math.min(screenW * 0.62, 340);
    const r = d / 2 - 3;
    return (
      <View style={styles.center} pointerEvents="none">
        <Svg width={d} height={d}>
          <Circle cx={d / 2} cy={d / 2} r={r} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray="10 8" />
        </Svg>
      </View>
    );
  }

  // box
  const w = Math.min(screenW * 0.66, 380);
  const h = w / shape.ratio;
  return (
    <View style={styles.center} pointerEvents="none">
      <Svg width={w} height={h}>
        <Rect
          x={2}
          y={2}
          width={w - 4}
          height={h - 4}
          rx={12}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
          strokeDasharray="10 8"
        />
      </Svg>
    </View>
  );
}

function HorizonLine({ roll, status }: { roll: SharedValue<number>; status: LevelStatus }) {
  const animated = useAnimatedStyle(() => {
    'worklet';
    const clamped = Math.max(-MAX_TILT, Math.min(MAX_TILT, roll.value));
    return { transform: [{ rotate: `${clamped}deg` }] };
  });
  const color = status === 'level' ? LEVEL_GREEN : status === 'close' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';

  return (
    <View style={styles.center} pointerEvents="none">
      {/* fixed reference the moving line snaps to when level */}
      <View style={styles.levelRef} />
      <Animated.View style={[styles.levelLineWrap, animated]}>
        <View style={[styles.levelLine, { backgroundColor: color }]} />
        <View style={[styles.levelDot, { borderColor: color, backgroundColor: status === 'level' ? `${LEVEL_GREEN}33` : 'transparent' }]} />
      </Animated.View>
    </View>
  );
}

function LevelPill({ status }: { status: LevelStatus }) {
  if (status === 'off') return null;
  const level = status === 'level';
  return (
    <View style={[styles.levelPill, { backgroundColor: level ? 'rgba(52,211,153,0.16)' : colors.scrim, borderColor: level ? LEVEL_GREEN : 'transparent' }]}>
      <Text variant="caption" color={level ? LEVEL_GREEN : '#FFFFFF'}>
        {level ? 'Level · À niveau' : 'Tilt to level · Redresse'}
      </Text>
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
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.3)' },
  gridV: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  gridH: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
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
    maxWidth: '86%',
  },
  levelRef: { position: 'absolute', width: '46%', height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.28)' },
  levelLineWrap: { width: '52%', alignItems: 'center', justifyContent: 'center' },
  levelLine: { width: '100%', height: 2, borderRadius: 2 },
  levelDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  levelPill: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
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
