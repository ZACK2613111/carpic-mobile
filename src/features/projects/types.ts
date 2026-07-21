export type HotspotKind = 'marketing' | 'inspection';
export type Severity = 'low' | 'medium' | 'high';
export type EditorMode = 'marketing' | 'inspection';

export type Hotspot = {
  id: string;
  kind: HotspotKind;
  /** normalized 0..1 position within the canvas (survives resolution/export scaling). */
  x: number;
  y: number;
  title: string;
  description?: string;
  /** inspection hotspots only. */
  severity?: Severity;
  /** optional close-up detail photo — storage path in the private projects bucket. */
  photoPath?: string;
};

export type PlateStyle = 'blur' | 'brand';

/** License-plate mask — normalized top-left + size, like hotspots. */
export type PlateMask = {
  x: number;
  y: number;
  w: number;
  h: number;
  style: PlateStyle;
  /** brand style fill. */
  color?: string;
};

export type ProjectDoc = {
  version: number;
  hotspots: Hotspot[];
  /** Ground-shadow override; undefined = per-background default. */
  shadow?: boolean;
  /** License-plate mask; undefined = none. */
  plate?: PlateMask;
};

export type ProjectStatus = 'draft' | 'ready' | 'published';

/** A hotspot anchored to a specific frame of the 360 spin. */
export type SpinHotspot = Hotspot & { frame: number };

export type SpinData = {
  frameCount: number;
  hasCutout?: boolean;
  backgroundId?: string;
  hotspots: SpinHotspot[];
  /** Ground-shadow override; undefined = per-background default. */
  shadow?: boolean;
};

export const EMPTY_SPIN: SpinData = {
  frameCount: 0,
  hasCutout: false,
  backgroundId: 'transparent',
  hotspots: [],
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  mode: EditorMode;
  background_id: string;
  doc: ProjectDoc;
  original_path: string | null;
  cutout_path: string | null;
  export_path: string | null;
  thumb_path: string | null;
  status?: ProjectStatus;
  spin?: SpinData;
  /** Raw 17-char VIN; make/year/region are decoded on-device from it. */
  vin?: string | null;
  published_url?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectPatch = Partial<
  Pick<
    Project,
    | 'name'
    | 'mode'
    | 'background_id'
    | 'doc'
    | 'original_path'
    | 'cutout_path'
    | 'export_path'
    | 'thumb_path'
    | 'status'
    | 'spin'
    | 'vin'
    | 'published_url'
    | 'published_at'
  >
>;

export const EMPTY_DOC: ProjectDoc = { version: 1, hotspots: [] };

// ---- runtime coercion at the DB boundary ----------------------------------
// `doc` and `spin` are free-form jsonb: a bad write (older app version, manual
// SQL edit) must degrade to an empty doc, not crash the editor. These are the
// only places raw rows become typed data.

function isHotspot(value: unknown): value is Hotspot {
  if (!value || typeof value !== 'object') return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h.id === 'string' &&
    typeof h.x === 'number' &&
    typeof h.y === 'number' &&
    typeof h.title === 'string' &&
    (h.kind === 'marketing' || h.kind === 'inspection')
  );
}

function isPlate(value: unknown): value is PlateMask {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
  return (
    num(p.x) && num(p.y) && num(p.w) && num(p.h) &&
    (p.w as number) > 0 && (p.h as number) > 0 &&
    (p.style === 'blur' || p.style === 'brand')
  );
}

export function coerceDoc(value: unknown): ProjectDoc {
  if (!value || typeof value !== 'object') return EMPTY_DOC;
  const v = value as Partial<ProjectDoc>;
  return {
    version: typeof v.version === 'number' ? v.version : 1,
    hotspots: Array.isArray(v.hotspots) ? v.hotspots.filter(isHotspot) : [],
    ...(typeof v.shadow === 'boolean' ? { shadow: v.shadow } : {}),
    ...(isPlate(v.plate) ? { plate: v.plate } : {}),
  };
}

export function coerceSpin(value: unknown): SpinData {
  if (!value || typeof value !== 'object') return EMPTY_SPIN;
  const v = value as Partial<SpinData>;
  const isSpinHotspot = (h: unknown): h is SpinHotspot =>
    isHotspot(h) && typeof (h as SpinHotspot).frame === 'number';
  return {
    frameCount: typeof v.frameCount === 'number' && v.frameCount > 0 ? Math.floor(v.frameCount) : 0,
    hasCutout: Boolean(v.hasCutout),
    backgroundId: typeof v.backgroundId === 'string' ? v.backgroundId : 'transparent',
    hotspots: Array.isArray(v.hotspots) ? v.hotspots.filter(isSpinHotspot) : [],
    ...(typeof v.shadow === 'boolean' ? { shadow: v.shadow } : {}),
  };
}
