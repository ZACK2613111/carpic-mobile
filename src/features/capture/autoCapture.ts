// Pure, timer-free decision logic for auto-capture.
//
// The effect + setTimeout live in useAutoCapture.ts; the *rules* live here (no
// react, no timers) so they stay unit-testable under the repo's zero-mock jest
// setup — the same split as level.ts ↔ useHorizonLevel.ts.

import type { LevelStatus } from './level';

/** Sustained time at 'level' required before the shutter fires. */
export const AUTO_HOLD_MS = 1400;
/** After a shot, how long 'level' is ignored so a held phone can't double-fire. */
export const AUTO_COOLDOWN_MS = 1200;

/**
 * Whether auto-capture should be counting down: the feature is on, capture is
 * active (camera ready, not reviewing/saving), and the phone is currently level.
 */
export function isArmed(p: { enabled: boolean; active: boolean; levelStatus: LevelStatus }): boolean {
  return p.enabled && p.active && p.levelStatus === 'level';
}

/** The earliest time a new hold may arm again after a shot fired at `firedAt`. */
export function cooldownUntil(firedAt: number): number {
  return firedAt + AUTO_COOLDOWN_MS;
}

/** True once the post-shot cooldown has elapsed (inclusive at the boundary). */
export function cooldownElapsed(now: number, until: number): boolean {
  return now >= until;
}
