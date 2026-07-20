// Per-angle framing guides for the guided capture overlay.
//
// Pure data (no react-native-svg import) so it's unit-testable and shared by
// GuideOverlay. Exterior angles render a generic ghost car outline oriented to
// the requested view (mirrored L/R via `flip`); non-exterior slots render a
// simple shape — a circle to fill for wheels, a framing box for details,
// interior and engine. Outlines are deliberately generic: the driver aligns a
// real car of any shape into them, they are not a match for one model.

import type { GuideId } from './shotTemplate';

export type GuideShape =
  | { kind: 'path'; viewBox: string; path: string; flip: boolean }
  | { kind: 'circle' }
  | { kind: 'box'; ratio: number }; // ratio = width / height of the framing box

export type SilhouetteGuide = {
  shape: GuideShape;
  /** Short framing hint, English. */
  label: string;
  /** Short framing hint, French. */
  labelFr: string;
};

// --- base outlines (body + wheels, single stroked path) ---

const PROFILE = {
  viewBox: '0 0 200 84',
  path:
    'M14 60 C14 53 19 49 27 48 L52 30 C60 24 70 21 84 21 L120 21 C142 21 158 27 170 39 ' +
    'L186 49 C193 51 196 55 196 60 L196 63 C196 65 194 66 192 66 L20 66 C16 66 14 64 14 60 Z ' +
    'M47 64a13 13 0 1 0 26 0a13 13 0 1 0 -26 0Z M139 64a13 13 0 1 0 26 0a13 13 0 1 0 -26 0Z',
};

const HEADON = {
  viewBox: '0 0 200 120',
  path:
    'M30 98 L30 64 C30 54 36 48 48 46 L66 30 C70 24 78 20 88 20 L112 20 C122 20 130 24 134 30 ' +
    'L152 46 C164 48 170 54 170 64 L170 98 C170 104 166 106 160 106 L40 106 C34 106 30 104 30 98 Z ' +
    'M40 106a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z M136 106a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z',
};

const THREE_QUARTER = {
  viewBox: '0 0 220 120',
  path:
    'M20 92 L16 68 C16 60 20 55 30 53 L74 40 C82 30 96 25 116 25 L150 26 C176 27 196 34 208 48 ' +
    'L216 66 C220 72 220 80 218 86 L216 92 C216 96 213 98 208 98 L28 98 C22 98 20 96 20 92 Z ' +
    'M169 98a17 17 0 1 0 34 0a17 17 0 1 0 -34 0Z M46 96a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z',
};

function pathShape(base: { viewBox: string; path: string }, flip: boolean): GuideShape {
  return { kind: 'path', viewBox: base.viewBox, path: base.path, flip };
}

const EXTERIOR = { front: 'De face, cadre rempli', profile: 'Profil complet', tq: 'Angle trois-quarts' };

const REGISTRY: Record<GuideId, SilhouetteGuide> = {
  front: { shape: pathShape(HEADON, false), label: 'Face on, fill the frame', labelFr: EXTERIOR.front },
  rear: { shape: pathShape(HEADON, false), label: 'Rear, fill the frame', labelFr: 'Arrière, cadre rempli' },
  sideR: { shape: pathShape(PROFILE, false), label: 'Full side profile', labelFr: EXTERIOR.profile },
  sideL: { shape: pathShape(PROFILE, true), label: 'Full side profile', labelFr: EXTERIOR.profile },
  front34r: { shape: pathShape(THREE_QUARTER, false), label: 'Three-quarter angle', labelFr: EXTERIOR.tq },
  front34l: { shape: pathShape(THREE_QUARTER, true), label: 'Three-quarter angle', labelFr: EXTERIOR.tq },
  rear34r: { shape: pathShape(THREE_QUARTER, false), label: 'Three-quarter angle', labelFr: EXTERIOR.tq },
  rear34l: { shape: pathShape(THREE_QUARTER, true), label: 'Three-quarter angle', labelFr: EXTERIOR.tq },
  wheel: { shape: { kind: 'circle' }, label: 'Fill the frame with the wheel', labelFr: 'Remplir le cadre avec la roue' },
  detail: { shape: { kind: 'box', ratio: 1.5 }, label: 'Get close, keep it sharp', labelFr: 'Approche, reste net' },
  interior: { shape: { kind: 'box', ratio: 1.6 }, label: 'Hold steady, wide framing', labelFr: 'Stable, cadrage large' },
  engine: { shape: { kind: 'box', ratio: 1.6 }, label: 'Open the bonnet', labelFr: 'Ouvre le capot' },
};

const FALLBACK: SilhouetteGuide = {
  shape: { kind: 'box', ratio: 1.4 },
  label: 'Center the subject',
  labelFr: 'Centre le sujet',
};

/** Framing guide for a slot's GuideId. Always defined (falls back to a box). */
export function getSilhouette(guide: GuideId): SilhouetteGuide {
  return REGISTRY[guide] ?? FALLBACK;
}
