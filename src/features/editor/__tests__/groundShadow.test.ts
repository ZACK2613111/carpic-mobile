import { getBackground } from '../backgrounds';
import { groundShadowEllipse, shadowEnabled, shadowStyleFor } from '../groundShadow';

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
