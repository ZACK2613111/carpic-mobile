import { relativeTime } from '../relativeTime';

const NOW = Date.parse('2026-07-20T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('relativeTime', () => {
  it('returns empty string for missing or invalid input', () => {
    expect(relativeTime(null, NOW)).toBe('');
    expect(relativeTime(undefined, NOW)).toBe('');
    expect(relativeTime('not-a-date', NOW)).toBe('');
  });

  it('collapses very recent times to "just now"', () => {
    expect(relativeTime(ago(0), NOW)).toBe('just now');
    expect(relativeTime(ago(30 * SEC), NOW)).toBe('just now');
  });

  it('formats minutes, hours and days', () => {
    expect(relativeTime(ago(5 * MIN), NOW)).toBe('5m ago');
    expect(relativeTime(ago(3 * HOUR), NOW)).toBe('3h ago');
    expect(relativeTime(ago(2 * DAY), NOW)).toBe('2d ago');
    expect(relativeTime(ago(10 * DAY), NOW)).toBe('1w ago');
  });

  it('falls back to a short date beyond a month', () => {
    // ~2 months earlier, same year → "Mon Day"
    expect(relativeTime(ago(60 * DAY), NOW)).toBe('May 21');
    // Prior year → "Mon Year"
    expect(relativeTime('2024-03-15T00:00:00Z', NOW)).toBe('Mar 2024');
  });

  it('never shows negative durations for clock skew', () => {
    expect(relativeTime(new Date(NOW + 5 * MIN).toISOString(), NOW)).toBe('just now');
  });
});
