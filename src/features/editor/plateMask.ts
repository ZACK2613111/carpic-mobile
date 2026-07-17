import type { PlateMask } from '@/features/projects/types';

// License-plate mask v1 — one axis-aligned rectangle per shot, normalized 0..1
// like hotspots so it survives export scaling. Pure geometry lives here so the
// store, the Skia canvas and the tests share one implementation.

export const MIN_PLATE_W = 0.06;
export const MIN_PLATE_H = 0.02;

/** Brand-plate fill choices (dark, light, CarStudio blue). */
export const PLATE_BRAND_COLORS = ['#14161A', '#F2F4F8', '#4B7BFF'];

/**
 * Best-effort starting position: a plate-like ratio in the lower-middle of the
 * frame, where a bumper plate sits on a guided capture. The user drags it into
 * place from there. (Auto-detection via text recognition is a later refinement.)
 */
export function defaultPlate(): PlateMask {
  return { x: 0.39, y: 0.6, w: 0.22, h: 0.05, style: 'blur' };
}

export type PlateHit = 'resize' | 'inside' | null;

/**
 * Hit-test in canvas pixels (like the pin hit-test). The bottom-right resize
 * handle wins over the body so it stays grabbable on a small plate.
 */
export function hitPlate(
  plate: PlateMask,
  nx: number,
  ny: number,
  width: number,
  height: number,
  handleRadius: number
): PlateHit {
  const px = nx * width;
  const py = ny * height;
  const right = (plate.x + plate.w) * width;
  const bottom = (plate.y + plate.h) * height;
  const dx = px - right;
  const dy = py - bottom;
  if (dx * dx + dy * dy <= handleRadius * handleRadius) return 'resize';
  const m = 6; // finger-friendly margin
  if (
    px >= plate.x * width - m &&
    px <= right + m &&
    py >= plate.y * height - m &&
    py <= bottom + m
  ) {
    return 'inside';
  }
  return null;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Center the plate on the pointer, kept fully inside the canvas. */
export function movePlate(plate: PlateMask, nx: number, ny: number): PlateMask {
  return {
    ...plate,
    x: clamp(nx - plate.w / 2, 0, 1 - plate.w),
    y: clamp(ny - plate.h / 2, 0, 1 - plate.h),
  };
}

/** Resize from the fixed top-left corner toward the pointer, clamped to canvas + minimum size. */
export function resizePlate(plate: PlateMask, nx: number, ny: number): PlateMask {
  return {
    ...plate,
    w: clamp(nx - plate.x, MIN_PLATE_W, 1 - plate.x),
    h: clamp(ny - plate.y, MIN_PLATE_H, 1 - plate.y),
  };
}
