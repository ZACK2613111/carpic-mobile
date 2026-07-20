import { SHOT_TEMPLATE, type GuideId } from '../shotTemplate';
import { getSilhouette } from '../silhouettes';

// Every GuideId in the union — kept in sync with shotTemplate's GuideId type.
const ALL_GUIDES: GuideId[] = [
  'front',
  'front34l',
  'front34r',
  'sideL',
  'sideR',
  'rear',
  'rear34l',
  'rear34r',
  'wheel',
  'detail',
  'interior',
  'engine',
];

describe('getSilhouette registry', () => {
  it('has a complete entry for every GuideId', () => {
    for (const guide of ALL_GUIDES) {
      const g = getSilhouette(guide);
      expect(g).toBeDefined();
      expect(typeof g.label).toBe('string');
      expect(g.label.length).toBeGreaterThan(0);
      expect(typeof g.labelFr).toBe('string');
      expect(g.labelFr.length).toBeGreaterThan(0);
    }
  });

  it('covers every guide actually used by the shot template', () => {
    for (const slot of SHOT_TEMPLATE) {
      expect(getSilhouette(slot.guide)).toBeDefined();
    }
  });

  it('maps each family to the right shape kind', () => {
    expect(getSilhouette('front').shape.kind).toBe('path');
    expect(getSilhouette('sideR').shape.kind).toBe('path');
    expect(getSilhouette('front34r').shape.kind).toBe('path');
    expect(getSilhouette('wheel').shape.kind).toBe('circle');
    expect(getSilhouette('detail').shape.kind).toBe('box');
    expect(getSilhouette('interior').shape.kind).toBe('box');
    expect(getSilhouette('engine').shape.kind).toBe('box');
  });

  it('mirrors left/right variants of the same base outline', () => {
    const r = getSilhouette('sideR').shape;
    const l = getSilhouette('sideL').shape;
    if (r.kind !== 'path' || l.kind !== 'path') throw new Error('expected path shapes');
    expect(r.path).toBe(l.path); // same base outline
    expect(r.flip).toBe(false);
    expect(l.flip).toBe(true);
  });

  it('falls back to a box for an unknown guide, never undefined', () => {
    const g = getSilhouette('nope' as GuideId);
    expect(g).toBeDefined();
    expect(g.shape.kind).toBe('box');
    expect(g.label.length).toBeGreaterThan(0);
  });
});
