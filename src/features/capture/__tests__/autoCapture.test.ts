import {
  AUTO_COOLDOWN_MS,
  AUTO_HOLD_MS,
  cooldownElapsed,
  cooldownUntil,
  isArmed,
} from '../autoCapture';
import type { LevelStatus } from '../level';

describe('isArmed', () => {
  const on = { enabled: true, active: true, levelStatus: 'level' as LevelStatus };

  it('arms only when enabled, active, and perfectly level', () => {
    expect(isArmed(on)).toBe(true);
  });

  it('does not arm when the feature is off', () => {
    expect(isArmed({ ...on, enabled: false })).toBe(false);
  });

  it('does not arm while reviewing / saving (inactive)', () => {
    expect(isArmed({ ...on, active: false })).toBe(false);
  });

  it.each<LevelStatus>(['close', 'off'])('does not arm when the phone is %s (not level)', (levelStatus) => {
    expect(isArmed({ ...on, levelStatus })).toBe(false);
  });
});

describe('cooldown', () => {
  it('pushes the gate AUTO_COOLDOWN_MS past the shot time', () => {
    expect(cooldownUntil(10_000)).toBe(10_000 + AUTO_COOLDOWN_MS);
  });

  it('stays gated during the cooldown window', () => {
    const until = cooldownUntil(10_000);
    expect(cooldownElapsed(10_000, until)).toBe(false);
    expect(cooldownElapsed(until - 1, until)).toBe(false);
  });

  it('opens exactly at the boundary and after (inclusive)', () => {
    const until = cooldownUntil(10_000);
    expect(cooldownElapsed(until, until)).toBe(true);
    expect(cooldownElapsed(until + 1, until)).toBe(true);
  });

  it('is open by default (until = 0) so the first hold can arm', () => {
    expect(cooldownElapsed(Date.now(), 0)).toBe(true);
  });
});

describe('timing constants', () => {
  it('are positive and the hold is long enough to be deliberate', () => {
    expect(AUTO_HOLD_MS).toBeGreaterThan(500);
    expect(AUTO_COOLDOWN_MS).toBeGreaterThan(0);
  });
});
