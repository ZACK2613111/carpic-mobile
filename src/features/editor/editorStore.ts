import { create } from 'zustand';

import type { CutoutBounds, EditorMode, Hotspot, PlateMask } from '@/features/projects/types';
import { clamp01, createHotspot } from './hotspots';
import { movePlate, resizePlate } from './plateMask';

const HISTORY_CAP = 40;

type Snapshot = {
  hotspots: Hotspot[];
  backgroundId: string;
  mode: EditorMode;
  name: string;
  shadow?: boolean;
  plate?: PlateMask;
};

type LoadPayload = {
  projectId: string;
  name: string;
  mode: EditorMode;
  backgroundId: string;
  originalUri: string | null;
  cutoutUri: string | null;
  hotspots: Hotspot[];
  shadow?: boolean;
  plate?: PlateMask;
  bounds?: CutoutBounds;
};

type EditorState = {
  projectId: string | null;
  name: string;
  mode: EditorMode;
  backgroundId: string;
  originalUri: string | null;
  cutoutUri: string | null;
  hotspots: Hotspot[];
  selectedId: string | null;
  /** Ground-shadow override; undefined = per-background default. */
  shadow?: boolean;
  /** License-plate mask; undefined = none. */
  plate?: PlateMask;
  /** Normalized alpha bounds of the cutout (for the published viewer's shadow/reflection). */
  bounds?: CutoutBounds;
  /** Whether the plate (not a pin) is the current selection. */
  plateSelected: boolean;
  dirty: boolean;
  hydrated: boolean;
  past: Snapshot[];
  future: Snapshot[];

  load: (payload: LoadPayload) => void;
  reset: () => void;

  setName: (name: string) => void;
  setMode: (mode: EditorMode) => void;
  setBackground: (backgroundId: string) => void;
  setShadow: (shadow: boolean) => void;
  setOriginalUri: (uri: string | null) => void;
  setCutout: (uri: string) => void;
  setBounds: (bounds: CutoutBounds | undefined) => void;

  setPlate: (plate: PlateMask | undefined) => void;
  patchPlate: (patch: Partial<Omit<PlateMask, 'x' | 'y'>>) => void;
  movePlateTo: (nx: number, ny: number) => void;
  resizePlateTo: (nx: number, ny: number) => void;
  selectPlate: (on: boolean) => void;

  addHotspot: (x: number, y: number) => void;
  moveHotspot: (id: string, x: number, y: number) => void;
  nudgeHotspot: (id: string, dx: number, dy: number) => void;
  updateHotspot: (id: string, patch: Partial<Omit<Hotspot, 'id'>>) => void;
  removeHotspot: (id: string) => void;
  setSelected: (id: string | null) => void;

  beginInteraction: () => void;
  undo: () => void;
  redo: () => void;

  markSaved: () => void;
};

const initial = {
  projectId: null,
  name: '',
  mode: 'marketing' as EditorMode,
  backgroundId: 'transparent',
  originalUri: null,
  cutoutUri: null,
  hotspots: [] as Hotspot[],
  selectedId: null as string | null,
  shadow: undefined as boolean | undefined,
  plate: undefined as PlateMask | undefined,
  bounds: undefined as CutoutBounds | undefined,
  plateSelected: false,
  dirty: false,
  hydrated: false,
  past: [] as Snapshot[],
  future: [] as Snapshot[],
};

export const useEditorStore = create<EditorState>((set, get) => {
  const snapshot = (): Snapshot => {
    const s = get();
    return {
      hotspots: s.hotspots,
      backgroundId: s.backgroundId,
      mode: s.mode,
      name: s.name,
      shadow: s.shadow,
      plate: s.plate,
    };
  };
  const pushHistory = () =>
    set((s) => ({ past: [...s.past, snapshot()].slice(-HISTORY_CAP), future: [] }));

  return {
    ...initial,

    load: (p) =>
      set({
        projectId: p.projectId,
        name: p.name,
        mode: p.mode,
        backgroundId: p.backgroundId,
        originalUri: p.originalUri,
        cutoutUri: p.cutoutUri,
        hotspots: p.hotspots,
        shadow: p.shadow,
        plate: p.plate,
        bounds: p.bounds,
        selectedId: null,
        plateSelected: false,
        dirty: false,
        hydrated: true,
        past: [],
        future: [],
      }),

    reset: () => set({ ...initial }),

    setName: (name) => set({ name, dirty: true }),
    setMode: (mode) => {
      pushHistory();
      set({ mode, dirty: true });
    },
    setBackground: (backgroundId) => {
      pushHistory();
      set({ backgroundId, dirty: true });
    },
    setShadow: (shadow) => {
      pushHistory();
      set({ shadow, dirty: true });
    },
    setOriginalUri: (originalUri) => set({ originalUri }),
    setCutout: (uri) => set({ cutoutUri: uri, dirty: true }),
    setBounds: (bounds) => set({ bounds, dirty: true }),

    setPlate: (plate) => {
      pushHistory();
      set({ plate, dirty: true, ...(plate ? {} : { plateSelected: false }) });
    },
    patchPlate: (patch) => {
      pushHistory();
      set((s) => (s.plate ? { plate: { ...s.plate, ...patch }, dirty: true } : {}));
    },
    // Continuous drag/resize — beginInteraction() snapshots once at gesture start.
    movePlateTo: (nx, ny) =>
      set((s) => (s.plate ? { plate: movePlate(s.plate, nx, ny), dirty: true } : {})),
    resizePlateTo: (nx, ny) =>
      set((s) => (s.plate ? { plate: resizePlate(s.plate, nx, ny), dirty: true } : {})),

    // The plate and pins share one selection: selecting either clears the other.
    selectPlate: (on) => set(on ? { plateSelected: true, selectedId: null } : { plateSelected: false }),

    addHotspot: (x, y) => {
      pushHistory();
      set((s) => {
        const count = s.hotspots.filter((h) => h.kind === s.mode).length + 1;
        const hotspot = createHotspot(s.mode, x, y, count);
        return { hotspots: [...s.hotspots, hotspot], selectedId: hotspot.id, plateSelected: false, dirty: true };
      });
    },

    moveHotspot: (id, x, y) =>
      set((s) => ({
        hotspots: s.hotspots.map((h) => (h.id === id ? { ...h, x: clamp01(x), y: clamp01(y) } : h)),
        dirty: true,
      })),

    nudgeHotspot: (id, dx, dy) => {
      pushHistory();
      set((s) => ({
        hotspots: s.hotspots.map((h) =>
          h.id === id ? { ...h, x: clamp01(h.x + dx), y: clamp01(h.y + dy) } : h
        ),
        dirty: true,
      }));
    },

    updateHotspot: (id, patch) => {
      pushHistory();
      set((s) => ({
        hotspots: s.hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        dirty: true,
      }));
    },

    removeHotspot: (id) => {
      pushHistory();
      set((s) => ({
        hotspots: s.hotspots.filter((h) => h.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        dirty: true,
      }));
    },

    setSelected: (id) => set((s) => ({ selectedId: id, plateSelected: id ? false : s.plateSelected })),

    // Snapshot once at the start of a continuous gesture (e.g. dragging a pin).
    beginInteraction: () => pushHistory(),

    undo: () =>
      set((s) => {
        if (s.past.length === 0) return {};
        const prev = s.past[s.past.length - 1];
        const current = snapshot();
        return {
          ...prev,
          selectedId: null,
          plateSelected: false,
          past: s.past.slice(0, -1),
          future: [current, ...s.future].slice(0, HISTORY_CAP),
          dirty: true,
        };
      }),

    redo: () =>
      set((s) => {
        if (s.future.length === 0) return {};
        const next = s.future[0];
        const current = snapshot();
        return {
          ...next,
          selectedId: null,
          plateSelected: false,
          past: [...s.past, current].slice(-HISTORY_CAP),
          future: s.future.slice(1),
          dirty: true,
        };
      }),

    markSaved: () => set({ dirty: false }),
  };
});
