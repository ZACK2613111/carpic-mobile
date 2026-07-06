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
};

export type ProjectDoc = {
  version: number;
  hotspots: Hotspot[];
};

export type ProjectStatus = 'draft' | 'ready' | 'published';

/** A hotspot anchored to a specific frame of the 360 spin. */
export type SpinHotspot = Hotspot & { frame: number };

export type SpinData = {
  frameCount: number;
  hasCutout?: boolean;
  backgroundId?: string;
  hotspots: SpinHotspot[];
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
    | 'published_url'
    | 'published_at'
  >
>;

export const EMPTY_DOC: ProjectDoc = { version: 1, hotspots: [] };
