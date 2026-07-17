import { coerceDoc } from '@/features/projects/types';
import {
  defaultPlate,
  hitPlate,
  MIN_PLATE_H,
  MIN_PLATE_W,
  movePlate,
  resizePlate,
} from '../plateMask';

const W = 800;
const H = 600;
const R = 26;

describe('defaultPlate', () => {
  it('starts fully inside the canvas, in the lower half, plate-shaped', () => {
    const p = defaultPlate();
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.w).toBeLessThanOrEqual(1);
    expect(p.y).toBeGreaterThan(0.5);
    expect(p.y + p.h).toBeLessThanOrEqual(1);
    expect(p.w / p.h).toBeGreaterThan(3); // wide, like a real plate
    expect(p.style).toBe('blur');
  });
});

describe('hitPlate', () => {
  const p = { x: 0.4, y: 0.6, w: 0.2, h: 0.05, style: 'blur' as const };

  it('detects inside, resize handle, and misses', () => {
    expect(hitPlate(p, 0.5, 0.62, W, H, R)).toBe('inside');
    expect(hitPlate(p, 0.6, 0.65, W, H, R)).toBe('resize'); // bottom-right corner
    expect(hitPlate(p, 0.1, 0.1, W, H, R)).toBeNull();
  });

  it('the resize handle wins over the body near the corner', () => {
    expect(hitPlate(p, 0.59, 0.645, W, H, R)).toBe('resize');
  });
});

describe('movePlate / resizePlate', () => {
  const p = { x: 0.4, y: 0.6, w: 0.2, h: 0.05, style: 'blur' as const };

  it('centers the plate on the pointer', () => {
    const moved = movePlate(p, 0.5, 0.5);
    expect(moved.x).toBeCloseTo(0.4);
    expect(moved.y).toBeCloseTo(0.475);
  });

  it('never leaves the canvas', () => {
    const m1 = movePlate(p, 1.5, 1.5);
    expect(m1.x + m1.w).toBeLessThanOrEqual(1);
    expect(m1.y + m1.h).toBeLessThanOrEqual(1);
    const m2 = movePlate(p, -1, -1);
    expect(m2.x).toBe(0);
    expect(m2.y).toBe(0);
  });

  it('resize respects the minimum size and the canvas edge', () => {
    const tiny = resizePlate(p, p.x, p.y);
    expect(tiny.w).toBe(MIN_PLATE_W);
    expect(tiny.h).toBe(MIN_PLATE_H);
    const huge = resizePlate(p, 2, 2);
    expect(huge.w).toBeCloseTo(1 - p.x);
    expect(huge.h).toBeCloseTo(1 - p.y);
  });
});

describe('coerceDoc with plate', () => {
  it('keeps a valid plate and drops a malformed one', () => {
    const good = coerceDoc({ version: 1, hotspots: [], plate: defaultPlate() });
    expect(good.plate).toBeDefined();
    const bad = coerceDoc({ version: 1, hotspots: [], plate: { x: 2, y: 0, w: 0, h: 'a', style: 'neon' } });
    expect(bad.plate).toBeUndefined();
  });
});
