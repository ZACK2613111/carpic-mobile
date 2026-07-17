import { coerceBrand, watermarkAnchor, watermarkVisible } from '../brand';

describe('coerceBrand', () => {
  it('fills defaults for missing/garbage input', () => {
    expect(coerceBrand(undefined)).toEqual({ text: '', enabled: false, position: 'bottom-right' });
    expect(coerceBrand({ position: 'nonsense', enabled: 'yes' })).toEqual({
      text: '',
      enabled: true,
      position: 'bottom-right',
    });
  });

  it('keeps valid positions and clamps text length', () => {
    expect(coerceBrand({ position: 'bottom-center' }).position).toBe('bottom-center');
    expect(coerceBrand({ position: 'bottom-left' }).position).toBe('bottom-left');
    expect(coerceBrand({ text: 'x'.repeat(200) }).text).toHaveLength(60);
  });
});

describe('watermarkVisible', () => {
  it('needs both the toggle on and non-blank text', () => {
    expect(watermarkVisible({ text: '0555', enabled: true, position: 'bottom-right' })).toBe(true);
    expect(watermarkVisible({ text: '0555', enabled: false, position: 'bottom-right' })).toBe(false);
    expect(watermarkVisible({ text: '   ', enabled: true, position: 'bottom-right' })).toBe(false);
    expect(watermarkVisible({ text: '', enabled: true, position: 'bottom-right' })).toBe(false);
  });
});

describe('watermarkAnchor', () => {
  const W = 1000;
  const H = 800;
  const M = 40;

  it('anchors to the correct corner/edge with the right alignment', () => {
    expect(watermarkAnchor('bottom-left', W, H, M)).toEqual({ x: 40, y: 760, align: 'left' });
    expect(watermarkAnchor('bottom-center', W, H, M)).toEqual({ x: 500, y: 760, align: 'center' });
    expect(watermarkAnchor('bottom-right', W, H, M)).toEqual({ x: 960, y: 760, align: 'right' });
  });

  it('always sits margin-above the bottom edge', () => {
    for (const p of ['bottom-left', 'bottom-center', 'bottom-right'] as const) {
      expect(watermarkAnchor(p, W, H, M).y).toBe(H - M);
    }
  });
});
