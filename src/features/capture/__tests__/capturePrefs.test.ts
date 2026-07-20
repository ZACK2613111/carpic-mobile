import { coerceCapturePrefs } from '../capturePrefs';

describe('coerceCapturePrefs', () => {
  it('returns the defaults for an empty / non-object input', () => {
    const d = { fastMode: false, grid: true, level: true };
    expect(coerceCapturePrefs({})).toEqual(d);
    expect(coerceCapturePrefs(null)).toEqual(d);
    expect(coerceCapturePrefs(undefined)).toEqual(d);
    expect(coerceCapturePrefs('nope')).toEqual(d);
  });

  it('coerces present-but-corrupt values with Boolean()', () => {
    expect(coerceCapturePrefs({ fastMode: 'yes', grid: 0, level: null })).toEqual({
      fastMode: true,
      grid: false,
      level: false,
    });
  });

  it('keeps a missing key at its default while overriding present ones', () => {
    expect(coerceCapturePrefs({ grid: false })).toEqual({ fastMode: false, grid: false, level: true });
    expect(coerceCapturePrefs({ fastMode: true })).toEqual({ fastMode: true, grid: true, level: true });
  });

  it('ignores extra keys and always yields booleans', () => {
    const out = coerceCapturePrefs({ foo: 1, bar: 'x', fastMode: 1 } as unknown);
    expect(out).toEqual({ fastMode: true, grid: true, level: true });
    expect(typeof out.fastMode).toBe('boolean');
    expect(typeof out.grid).toBe('boolean');
    expect(typeof out.level).toBe('boolean');
    expect('foo' in out).toBe(false);
  });
});
