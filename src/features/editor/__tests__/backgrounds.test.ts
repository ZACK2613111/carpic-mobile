import { BACKGROUND_PRESETS, getBackground } from '../backgrounds';

describe('backgrounds', () => {
  it('has unique preset ids', () => {
    const ids = BACKGROUND_PRESETS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getBackground returns the matching preset by id', () => {
    expect(getBackground('white')).toMatchObject({ kind: 'color', color: '#FFFFFF' });
    expect(getBackground('studio-graphite').kind).toBe('studio');
  });

  it('falls back to the first (transparent) preset for an unknown id', () => {
    const fallback = getBackground('nope');
    expect(fallback).toBe(BACKGROUND_PRESETS[0]);
    expect(fallback.kind).toBe('transparent');
  });

  it('every studio preset carries wall/floor/light colors', () => {
    for (const bg of BACKGROUND_PRESETS) {
      if (bg.kind === 'studio') {
        expect(bg.wall).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(bg.floor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(bg.light).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});
