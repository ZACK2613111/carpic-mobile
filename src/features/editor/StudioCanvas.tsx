import {
  Blur,
  Canvas,
  Circle,
  Group,
  Image as SkiaImage,
  LinearGradient,
  matchFont,
  Oval,
  Paint,
  RadialGradient,
  Rect,
  rect,
  RoundedRect,
  rrect,
  type SkImage,
  Text as SkiaText,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import React from 'react';
import { Platform } from 'react-native';

import type { Hotspot, PlateMask } from '@/features/projects/types';
import { colors, hotspotColor } from '@/theme';
import { getBackground, type BackgroundPreset } from './backgrounds';
import type { CanvasRef } from './exportImage';
import { groundShadowEllipse, shadowEnabled, shadowStyleFor } from './groundShadow';

const PIN_R = 15;
const FONT_SIZE = 15;
// Sub-pixel blur on the cutout layer softens the hard matte edge left by
// segmentation ("cut with scissors" look) without visibly blurring the car.
const EDGE_FEATHER = 0.8;
// Strong enough that plate characters can't be read back, even zoomed.
const PLATE_BLUR = 12;

const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'sans-serif' }) as string,
  fontSize: FONT_SIZE,
  fontStyle: 'normal',
  fontWeight: 'bold',
});

type Props = {
  width: number;
  height: number;
  canvasRef: CanvasRef;
  originalUri: string | null;
  cutoutUri: string | null;
  backgroundId: string;
  hotspots: Hotspot[];
  selectedId: string | null;
  /** Ground-shadow override; undefined = per-background default. */
  shadow?: boolean;
  /** License-plate mask; undefined = none. */
  plate?: PlateMask;
  /** Draw the plate's selection stroke + resize handle. */
  plateSelected?: boolean;
};

// Purely presentational: the editor owns gestures + the zoom transform and drives
// this component's props. Everything drawn here is flattened by makeImageSnapshot
// on export (except the crosshair, which is hidden at export time by clearing the
// selection).
export function StudioCanvas({
  width,
  height,
  canvasRef,
  originalUri,
  cutoutUri,
  backgroundId,
  hotspots,
  selectedId,
  shadow,
  plate,
  plateSelected,
}: Props) {
  // Decode only the image actually drawn: feeding both URIs to useImage keeps
  // two full-resolution bitmaps in memory at once — enough to OOM a low-RAM
  // device. The original is only ever shown when there is no cutout.
  const displayImage = useImage(cutoutUri ?? originalUri ?? null);
  const bg = getBackground(backgroundId);
  const selected = selectedId ? hotspots.find((h) => h.id === selectedId) ?? null : null;

  // Shadow + feather only make sense once the car is isolated from its
  // background — never on a raw original photo.
  const showingCutout = Boolean(cutoutUri);
  const withShadow = showingCutout && shadowEnabled(bg, shadow);

  return (
    <Canvas ref={canvasRef} style={{ width, height }}>
      <BackgroundLayer bg={bg} width={width} height={height} />
      {withShadow ? <GroundShadow bg={bg} width={width} height={height} /> : null}
      {displayImage ? (
        <Group layer={showingCutout ? <Paint><Blur blur={EDGE_FEATHER} /></Paint> : undefined}>
          <SkiaImage image={displayImage} x={0} y={0} width={width} height={height} fit="contain" />
        </Group>
      ) : null}
      {plate ? (
        <PlateLayer
          plate={plate}
          image={displayImage}
          width={width}
          height={height}
          selected={Boolean(plateSelected)}
        />
      ) : null}
      {selected ? (
        <Crosshair x={selected.x * width} y={selected.y * height} width={width} height={height} />
      ) : null}
      {hotspots.map((h, i) => (
        <PinLayer key={h.id} h={h} index={i} width={width} height={height} selected={h.id === selectedId} />
      ))}
    </Canvas>
  );
}

function PlateLayer({
  plate,
  image,
  width,
  height,
  selected,
}: {
  plate: PlateMask;
  image: SkImage | null;
  width: number;
  height: number;
  selected: boolean;
}) {
  const x = plate.x * width;
  const y = plate.y * height;
  const w = plate.w * width;
  const h = plate.h * height;
  const r = Math.min(w, h) * 0.18;
  const clip = rrect(rect(x, y, w, h), r, r);

  return (
    <Group>
      {plate.style === 'blur' && image ? (
        // Redraw the same contain-fit image clipped to the plate, blurred —
        // pixels line up 1:1 with the layer underneath, so only the plate blurs.
        <Group clip={clip} layer={<Paint><Blur blur={PLATE_BLUR} /></Paint>}>
          <SkiaImage image={image} x={0} y={0} width={width} height={height} fit="contain" />
        </Group>
      ) : (
        <Group>
          <RoundedRect x={x} y={y} width={w} height={h} r={r} color={plate.color ?? '#14161A'} />
          <RoundedRect
            x={x} y={y} width={w} height={h} r={r}
            style="stroke" strokeWidth={1.5} color="#FFFFFF" opacity={0.35}
          />
        </Group>
      )}
      {selected ? (
        <Group>
          <RoundedRect x={x} y={y} width={w} height={h} r={r} style="stroke" strokeWidth={2} color={colors.primary} />
          <Circle cx={x + w} cy={y + h} r={7} color="#FFFFFF" />
          <Circle cx={x + w} cy={y + h} r={7} style="stroke" strokeWidth={2} color={colors.primary} />
        </Group>
      ) : null}
    </Group>
  );
}

function GroundShadow({ bg, width, height }: { bg: BackgroundPreset; width: number; height: number }) {
  const { cx, cy, rx, ry } = groundShadowEllipse(width, height);
  const style = shadowStyleFor(bg);
  return (
    <Oval
      x={cx - rx}
      y={cy - ry}
      width={rx * 2}
      height={ry * 2}
      color={style.color}
      opacity={style.opacity}
    >
      <Blur blur={style.blur} />
    </Oval>
  );
}

function BackgroundLayer({ bg, width, height }: { bg: BackgroundPreset; width: number; height: number }) {
  if (bg.kind === 'transparent') return null;

  if (bg.kind === 'color') {
    return <Rect x={0} y={0} width={width} height={height} color={bg.color} />;
  }

  if (bg.kind === 'gradient') {
    return (
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={bg.colors} />
      </Rect>
    );
  }

  // studio: wall gradient + floor gradient + soft spotlight
  const horizon = height * 0.62;
  return (
    <Group>
      <Rect x={0} y={0} width={width} height={horizon}>
        <LinearGradient start={vec(0, 0)} end={vec(0, horizon)} colors={[lighten(bg.wall), bg.wall]} />
      </Rect>
      <Rect x={0} y={horizon} width={width} height={height - horizon}>
        <LinearGradient start={vec(0, horizon)} end={vec(0, height)} colors={[bg.floor, darken(bg.floor)]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width / 2, height * 0.28)}
          r={width * 0.75}
          colors={[withAlpha(bg.light, 0.55), withAlpha(bg.light, 0)]}
        />
      </Rect>
    </Group>
  );
}

function Crosshair({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  // Skia wants hex, not CSS rgba(); round to integer pixels for crisp 1px lines.
  const c = withAlpha('#FFFFFF', 0.45);
  const ix = Math.round(x);
  const iy = Math.round(y);
  return (
    <Group>
      <Rect x={0} y={iy} width={width} height={1} color={c} />
      <Rect x={ix} y={0} width={1} height={height} color={c} />
    </Group>
  );
}

function PinLayer({
  h,
  index,
  width,
  height,
  selected,
}: {
  h: Hotspot;
  index: number;
  width: number;
  height: number;
  selected: boolean;
}) {
  const cx = h.x * width;
  const cy = h.y * height;
  const color = hotspotColor(h.kind, h.severity);
  const r = selected ? PIN_R + 2 : PIN_R;
  const label = String(index + 1);
  const approxWidth = label.length * FONT_SIZE * 0.55;

  return (
    <Group>
      {selected ? <Circle cx={cx} cy={cy} r={r + 5} color="#FFFFFF" opacity={0.85} /> : null}
      <Circle cx={cx} cy={cy} r={r} color={color} />
      <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={2.5} color="#FFFFFF" />
      {font ? (
        <SkiaText x={cx - approxWidth / 2} y={cy + FONT_SIZE * 0.36} text={label} font={font} color="#FFFFFF" />
      ) : null}
    </Group>
  );
}

// ---- small hex color helpers (studio backgrounds) ------------------------
function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}
function toHex2(n: number) {
  return clampByte(n).toString(16).padStart(2, '0');
}
function mix(hex: string, target: number, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `#${toHex2(r + (target - r) * amt)}${toHex2(g + (target - g) * amt)}${toHex2(b + (target - b) * amt)}`;
}
function lighten(hex: string, amt = 0.18) {
  return mix(hex, 255, amt);
}
function darken(hex: string, amt = 0.35) {
  return mix(hex, 0, amt);
}
function withAlpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}${toHex2(a * 255)}`;
}
