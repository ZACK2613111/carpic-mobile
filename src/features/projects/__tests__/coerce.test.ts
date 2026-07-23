import { coerceDoc, coerceSpin } from '../types';

describe('coerceDoc (jsonb boundary)', () => {
  it('preserves a hotspot detail photo path and severity', () => {
    const doc = coerceDoc({
      version: 1,
      hotspots: [
        { id: 'a', kind: 'inspection', x: 0.1, y: 0.2, title: 'Scratch', severity: 'high', photoPath: 'u/p/hotspots/ext-front-a.jpg' },
      ],
    });
    expect(doc.hotspots).toHaveLength(1);
    expect(doc.hotspots[0].photoPath).toBe('u/p/hotspots/ext-front-a.jpg');
    expect(doc.hotspots[0].severity).toBe('high');
  });

  it('keeps a photo-less hotspot and drops malformed entries', () => {
    const doc = coerceDoc({
      hotspots: [
        { id: 'b', kind: 'marketing', x: 0.5, y: 0.5, title: 'Roof' },
        { id: 'bad', x: 0.5, y: 0.5 }, // missing kind + title → dropped
        42,
      ],
    });
    expect(doc.hotspots).toHaveLength(1);
    expect(doc.hotspots[0].id).toBe('b');
    expect(doc.hotspots[0].photoPath).toBeUndefined();
  });

  it('preserves valid cutout bounds and drops out-of-range ones', () => {
    const ok = coerceDoc({ hotspots: [], bounds: { x: 0.1, y: 0.2, width: 0.6, height: 0.5 } });
    expect(ok.bounds).toEqual({ x: 0.1, y: 0.2, width: 0.6, height: 0.5 });

    expect(coerceDoc({ hotspots: [], bounds: { x: 0.1, y: 0.2, width: 0, height: 0.5 } }).bounds).toBeUndefined();
    expect(coerceDoc({ hotspots: [], bounds: { x: -0.1, y: 0.2, width: 0.6, height: 0.5 } }).bounds).toBeUndefined();
    expect(coerceDoc({ hotspots: [], bounds: { x: 0.1, y: 0.2, width: 1.4, height: 0.5 } }).bounds).toBeUndefined();
    expect(coerceDoc({ hotspots: [], bounds: 'nope' }).bounds).toBeUndefined();
  });

  it('returns an empty doc for junk input', () => {
    expect(coerceDoc(null).hotspots).toEqual([]);
    expect(coerceDoc('nope').hotspots).toEqual([]);
  });
});

describe('coerceSpin (jsonb boundary)', () => {
  it('preserves frame index and photo path on spin hotspots', () => {
    const spin = coerceSpin({
      frameCount: 24,
      hotspots: [
        { id: 's', kind: 'inspection', x: 0.3, y: 0.4, title: 'Dent', frame: 5, photoPath: 'u/p/hotspots/spin-s.jpg' },
      ],
    });
    expect(spin.frameCount).toBe(24);
    expect(spin.hotspots).toHaveLength(1);
    expect(spin.hotspots[0].frame).toBe(5);
    expect(spin.hotspots[0].photoPath).toBe('u/p/hotspots/spin-s.jpg');
  });

  it('drops a spin hotspot with no frame', () => {
    const spin = coerceSpin({
      frameCount: 10,
      hotspots: [{ id: 'n', kind: 'marketing', x: 0.1, y: 0.1, title: 'x' }],
    });
    expect(spin.hotspots).toHaveLength(0);
  });
});
