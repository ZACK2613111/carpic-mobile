import type { EditorMode, Hotspot } from '@/features/projects/types';
import { uid } from '@/lib/uid';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Build a new hotspot with the mode's default title and severity.
 * `count` is the 1-based number of hotspots of this kind (used for "Feature 3").
 * Shared by the shot editor store and the 360 spin screen so the two never
 * drift on naming/defaults.
 */
export function createHotspot(kind: EditorMode, x: number, y: number, count: number): Hotspot {
  return {
    id: uid(),
    kind,
    x: clamp01(x),
    y: clamp01(y),
    title: kind === 'marketing' ? `Feature ${count}` : `Damage ${count}`,
    ...(kind === 'inspection' ? { severity: 'medium' as const } : {}),
  };
}
