import { useEffect, useRef } from 'react';

import { AUTO_HOLD_MS, cooldownElapsed, cooldownUntil, isArmed } from './autoCapture';
import type { LevelStatus } from './level';

// Auto-capture (v1): once the phone is held level for AUTO_HOLD_MS without
// slipping, fire the shutter automatically. It rides the existing horizon sensor
// — no image analysis — so it stays cheap and works the moment the guide does.
// All the timer-free rules live in ./autoCapture (unit-tested there).

type Params = {
  /** Auto-capture pref is on AND a motion sensor is available. */
  enabled: boolean;
  /** Camera is ready and we're not reviewing / saving a shot. */
  active: boolean;
  /** Live level band from useHorizonLevel. */
  levelStatus: LevelStatus;
  /** The shutter to trigger. Latest is always used (kept in a ref). */
  onFire: () => void;
};

/**
 * Returns `counting` = true while a level hold is in progress (for a "hold
 * steady…" indicator). The timer is armed only while the phone is `level` and
 * capture is active; leaving level (or going inactive) tears it down via the
 * effect cleanup, so the shot fires only after an uninterrupted AUTO_HOLD_MS.
 */
export function useAutoCapture({ enabled, active, levelStatus, onFire }: Params): { counting: boolean } {
  // "Latest" shutter ref, written in an effect (not during render) per the repo's
  // React-Compiler convention.
  const fire = useRef(onFire);
  useEffect(() => {
    fire.current = onFire;
  }, [onFire]);

  const cooldownRef = useRef(0);
  const armed = isArmed({ enabled, active, levelStatus });

  useEffect(() => {
    if (!armed) return;
    // Just fired and the phone is still level — skip until the cooldown passes.
    if (!cooldownElapsed(Date.now(), cooldownRef.current)) return;
    const timer = setTimeout(() => {
      cooldownRef.current = cooldownUntil(Date.now());
      fire.current();
    }, AUTO_HOLD_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return { counting: armed };
}
