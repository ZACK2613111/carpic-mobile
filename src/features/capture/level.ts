// Pure, sensor-free math for the live "level / horizon" guide.
//
// The expo-sensors subscription lives in useHorizonLevel.ts; keeping the math
// here (with no native import) means it stays unit-testable under the repo's
// zero-mock jest setup — the same convention as relativeTime.ts.

export const RAD_TO_DEG = 180 / Math.PI;

/** Within this many degrees of level counts as "aligned" (the guide turns green). */
export const LEVEL_TOLERANCE_DEG = 2;
/** Beyond this the phone is clearly tilted — the guide dims to 'off'. */
export const OFF_THRESHOLD_DEG = 6;

export type LevelStatus = 'level' | 'close' | 'off';

export function radToDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

/**
 * Bucket a roll angle (degrees, 0 = perfectly level) into a three-state guide
 * status. Boundaries are inclusive of the lower band: |roll| == tol is 'level'.
 */
export function levelStatus(
  rollDeg: number,
  tol: number = LEVEL_TOLERANCE_DEG,
  off: number = OFF_THRESHOLD_DEG
): LevelStatus {
  const a = Math.abs(rollDeg);
  if (a <= tol) return 'level';
  if (a <= off) return 'close';
  return 'off';
}

export function isLevel(rollDeg: number, tol: number = LEVEL_TOLERANCE_DEG): boolean {
  return Math.abs(rollDeg) <= tol;
}

/**
 * Roll (left/right tilt, in degrees) derived from the gravity vector — the
 * gyro-less fallback used when DeviceMotion.rotation is null. In portrait a
 * level phone has gravity pointing down the screen (x ≈ 0), so atan2(x, y) ≈ 0.
 * Best-effort: on devices without a gyroscope the guide simply reads roll from
 * the accelerometer instead of the fused rotation.
 */
export function rollFromGravity(x: number, y: number): number {
  return Math.atan2(x, y) * RAD_TO_DEG;
}
