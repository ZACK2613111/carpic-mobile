import type { BackgroundPreset } from './backgrounds';

// Synthetic ground shadow — the single biggest "collé → studio" upgrade for a
// cutout. Pure geometry/appearance so it can be unit-tested and shared by the
// Skia editor canvas, the RN spin viewer, and the published web viewer.

export type ShadowEllipse = { cx: number; cy: number; rx: number; ry: number };
export type ShadowStyle = { color: string; opacity: number; blur: number };

/** A shadow only reads against a surface — never on a transparent background. */
export function shadowDefaultEnabled(bg: BackgroundPreset): boolean {
  return bg.kind !== 'transparent';
}

/** Effective flag: an explicit per-shot override wins over the per-background default. */
export function shadowEnabled(bg: BackgroundPreset, override?: boolean): boolean {
  return override ?? shadowDefaultEnabled(bg);
}

/**
 * Ellipse under a contain-fit car, in canvas pixels. The car is assumed roughly
 * centered with its wheels near the lower third — true for guided-capture shots.
 * (A future refinement can derive this from the cutout's alpha bounding box.)
 */
export function groundShadowEllipse(width: number, height: number): ShadowEllipse {
  return {
    cx: width / 2,
    cy: height * 0.84,
    rx: width * 0.34,
    ry: height * 0.035,
  };
}

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Map a cutout's normalized alpha bounds (0..1 within the source image) to the
 * car's rectangle in canvas pixels, honoring the `contain` fit used to draw it.
 * `imageAspect` = imageWidth / imageHeight. Lets the shadow track the real car
 * instead of assuming a fixed position.
 */
export function carRectInCanvas(
  norm: Rect,
  imageAspect: number,
  canvasWidth: number,
  canvasHeight: number
): Rect {
  const canvasAspect = canvasWidth / canvasHeight;
  let dispW: number;
  let dispH: number;
  if (imageAspect > canvasAspect) {
    // image is wider than the canvas → constrained by width
    dispW = canvasWidth;
    dispH = canvasWidth / imageAspect;
  } else {
    dispH = canvasHeight;
    dispW = canvasHeight * imageAspect;
  }
  const offsetX = (canvasWidth - dispW) / 2;
  const offsetY = (canvasHeight - dispH) / 2;
  return {
    x: offsetX + norm.x * dispW,
    y: offsetY + norm.y * dispH,
    width: norm.width * dispW,
    height: norm.height * dispH,
  };
}

/**
 * A contact shadow tucked under the car's footprint. `car` is the vehicle's
 * bounding rect in canvas pixels (derived from the cutout's alpha bounds); the
 * ellipse sits on the wheel line (rect bottom), a touch narrower than the body.
 * Falls back to {@link groundShadowEllipse} when no bounds are available.
 */
export function groundShadowEllipseFromBounds(car: Rect, canvasHeight: number): ShadowEllipse {
  return {
    cx: car.x + car.width / 2,
    cy: car.y + car.height, // wheels ≈ the bottom of the alpha box
    rx: car.width * 0.46,
    ry: Math.max(canvasHeight * 0.012, car.height * 0.05),
  };
}

/** The tone the shadow falls on — its bottom-most color. */
function groundColor(bg: BackgroundPreset): string | null {
  switch (bg.kind) {
    case 'color':
      return bg.color;
    case 'gradient':
      return bg.colors[bg.colors.length - 1] ?? null;
    case 'studio':
      return bg.floor;
    default:
      return null;
  }
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  // Rec.709 coefficients — they sum to 1 so a pure-white ground hits the
  // ramp's designed maximum exactly.
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A light floor takes a stronger dark shadow; a dark floor needs it subtle or it
 * turns to mud. Opacity ramps 0.12 (dark ground) → 0.34 (white ground).
 */
export function shadowStyleFor(bg: BackgroundPreset): ShadowStyle {
  const ground = groundColor(bg) ?? '#808080';
  const opacity = 0.12 + luminance(ground) * 0.22;
  return { color: '#000000', opacity: Math.round(opacity * 1000) / 1000, blur: 18 };
}
