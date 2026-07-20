import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { levelStatus, radToDeg, rollFromGravity, type LevelStatus } from './level';

// The ONLY module that imports expo-sensors — kept out of every test path so the
// zero-mock jest suite never loads a native module. All the math lives in the
// pure ./level module.

const UPDATE_MS = 50; // 20 Hz — smooth for a level bubble, easy on the battery

export type HorizonLevel = {
  /** Live roll in degrees on the UI thread (0 = level). Drives the horizon line. */
  roll: SharedValue<number>;
  /** Coarse status; only changes on band crossings, so React re-renders are rare. */
  status: LevelStatus;
  /** Whether a motion sensor is present (false → hide the level guide). */
  available: boolean;
};

/**
 * Subscribe to device motion and expose a live roll angle. `roll` is a reanimated
 * shared value written every tick (no per-tick React re-render); `status` only
 * updates when the level band changes, and a success haptic fires once on
 * entering 'level'. Pass enabled=false to skip the subscription entirely.
 */
export function useHorizonLevel(enabled: boolean): HorizonLevel {
  const roll = useSharedValue(0);
  const [status, setStatus] = useState<LevelStatus>('off');
  const [available, setAvailable] = useState(true);
  const lastBucket = useRef<LevelStatus>('off');

  useEffect(() => {
    if (!enabled) return; // no subscription; the hook reports 'off' below
    let mounted = true;
    let sub: { remove: () => void } | undefined;

    (async () => {
      const ok = await DeviceMotion.isAvailableAsync().catch(() => false);
      if (!mounted) return;
      setAvailable(ok);
      if (!ok) return;

      DeviceMotion.setUpdateInterval(UPDATE_MS);
      sub = DeviceMotion.addListener((m: DeviceMotionMeasurement) => {
        // rotation.gamma is the left/right roll (horizon) in RADIANS; only
        // rotationRate is degrees. Fall back to the gravity vector on gyro-less
        // devices where `rotation` can be null.
        const deg = m.rotation
          ? radToDeg(m.rotation.gamma ?? 0)
          : rollFromGravity(m.accelerationIncludingGravity?.x ?? 0, m.accelerationIncludingGravity?.y ?? 9.8);
        roll.value = deg;
        const next = levelStatus(deg);
        if (next !== lastBucket.current) {
          lastBucket.current = next;
          setStatus(next);
          if (next === 'level') haptics.success();
        }
      });
    })();

    return () => {
      mounted = false;
      sub?.remove();
      lastBucket.current = 'off';
    };
  }, [enabled, roll]);

  // Derive (not setState) the disabled case so the effect body stays side-effect
  // free for the lint rule and there's no stale status when the guide is off.
  return { roll, status: enabled ? status : 'off', available };
}
