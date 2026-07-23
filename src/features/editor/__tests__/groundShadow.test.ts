import { getBackground } from '../backgrounds';
import {
  carRectInCanvas,
  groundShadowEllipse,
  groundShadowEllipseFromBounds,
  shadowEnabled,
  shadowStyleFor,
} from '../groundShadow';

describe('shadowEnabled', () => {
  it('defaults off on transparent, on for every surface background', () => {
    expect(shadowEnabled(getBackground('transparent'))).toBe(false);
    expect(shadowEnabled(getBackground('white'))).toBe(true);
    expect(shadowEnabled(getBackground('grad-ocean'))).toBe(true);
    expect(shadowEnabled(getBackground('studio-graphite'))).toBe(true);
  });

  it('an explicit override always wins over the default', () => {
    expect(shadowEnabled(getBackground('white'), false)).toBe(false);
    expect(shadowEnabled(getBackground('transparent'), true)).toBe(true);
  });
});

describe('shadowStyleFor', () => {
  it('is stronger on a light floor than on a dark one', () => {
    const light = shadowStyleFor(getBackground('studio-showroom'));
    const dark = shadowStyleFor(getBackground('studio-graphite'));
    expect(light.opacity).toBeGreaterThan(dark.opacity);
  });

  it('stays within the designed 0.12–0.34 opacity ramp', () => {
    for (const id of ['white', 'black', 'silver', 'grad-sunset', 'studio-blue']) {
      const { opacity } = shadowStyleFor(getBackground(id));
      expect(opacity).toBeGreaterThanOrEqual(0.12);
      expect(opacity).toBeLessThanOrEqual(0.34);
    }
  });
});

describe('groundShadowEllipse', () => {
  it('sits in the lower part of the canvas and scales with it', () => {
    const e = groundShadowEllipse(1000, 750);
    expect(e.cx).toBe(500);
    expect(e.cy).toBeGreaterThan(750 * 0.7);
    expect(e.cy).toBeLessThan(750);
    expect(e.rx).toBeGreaterThan(0);
    expect(e.ry).toBeGreaterThan(0);
    expect(e.rx).toBeLessThan(500); // narrower than the canvas — reads as "under the car"
  });
});

describe('carRectInCanvas', () => {
  const full = { x: 0, y: 0, width: 1, height: 1 };

  it('letterboxes a wide image inside a square canvas (bars top/bottom)', () => {
    // image 2:1 into a 1000x1000 canvas → displayed 1000x500, centered vertically
    const r = carRectInCanvas(full, 2, 1000, 1000);
    expect(r.x).toBeCloseTo(0);
    expect(r.width).toBeCloseTo(1000);
    expect(r.height).toBeCloseTo(500);
    expect(r.y).toBeCloseTo(250); // (1000-500)/2
  });

  it('pillarboxes a tall image inside a square canvas (bars left/right)', () => {
    // image 1:2 into 1000x1000 → displayed 500x1000, centered horizontally
    const r = carRectInCanvas(full, 0.5, 1000, 1000);
    expect(r.height).toBeCloseTo(1000);
    expect(r.width).toBeCloseTo(500);
    expect(r.x).toBeCloseTo(250);
    expect(r.y).toBeCloseTo(0);
  });

  it('maps a sub-region of the image into the fitted display rect', () => {
    // car occupies the middle 60% horizontally, lower 50% vertically of a square image
    const norm = { x: 0.2, y: 0.5, width: 0.6, height: 0.5 };
    const r = carRectInCanvas(norm, 1, 1000, 1000); // square image → fills canvas
    expect(r.x).toBeCloseTo(200);
    expect(r.y).toBeCloseTo(500);
    expect(r.width).toBeCloseTo(600);
    expect(r.height).toBeCloseTo(500);
  });
});

describe('groundShadowEllipseFromBounds', () => {
  it('centers under the car footprint and sits on the wheel line', () => {
    const car = { x: 200, y: 300, width: 600, height: 400 };
    const e = groundShadowEllipseFromBounds(car, 1000);
    expect(e.cx).toBe(500); // 200 + 600/2
    expect(e.cy).toBe(700); // 300 + 400 (bottom of the box)
    expect(e.rx).toBeCloseTo(276); // 600 * 0.46 — a touch narrower than the body
    expect(e.rx).toBeLessThan(car.width / 2 + car.x); // tucked within the frame
    expect(e.ry).toBeGreaterThan(0);
    expect(e.ry).toBeLessThan(e.rx); // a flat contact ellipse
  });

  it('tracks a car placed off-center (unlike the static ellipse)', () => {
    const left = groundShadowEllipseFromBounds({ x: 50, y: 400, width: 300, height: 200 }, 1000);
    const right = groundShadowEllipseFromBounds({ x: 650, y: 400, width: 300, height: 200 }, 1000);
    expect(left.cx).toBeLessThan(right.cx);
    expect(left.cx).toBe(200);
    expect(right.cx).toBe(800);
  });
});
