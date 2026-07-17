import { useEditorStore } from '../editorStore';

const basePayload = {
  projectId: 'shot-1',
  name: 'Front',
  mode: 'marketing' as const,
  backgroundId: 'transparent',
  originalUri: null,
  cutoutUri: null,
  hotspots: [],
};

const store = () => useEditorStore.getState();

beforeEach(() => {
  store().reset();
  store().load(basePayload);
});

describe('load / reset', () => {
  it('hydrates and starts clean (no history, not dirty)', () => {
    const s = store();
    expect(s.hydrated).toBe(true);
    expect(s.dirty).toBe(false);
    expect(s.past).toHaveLength(0);
    expect(s.future).toHaveLength(0);
  });

  it('reset returns to the unhydrated initial state', () => {
    store().addHotspot(0.5, 0.5);
    store().reset();
    expect(store().hydrated).toBe(false);
    expect(store().hotspots).toHaveLength(0);
  });
});

describe('addHotspot', () => {
  it('adds a selected hotspot, marks dirty and numbers per kind', () => {
    store().addHotspot(0.3, 0.4);
    store().addHotspot(0.6, 0.7);
    const s = store();
    expect(s.hotspots).toHaveLength(2);
    expect(s.hotspots[1].title).toBe('Feature 2');
    expect(s.selectedId).toBe(s.hotspots[1].id);
    expect(s.dirty).toBe(true);
  });

  it('clamps coordinates into 0..1', () => {
    store().addHotspot(-0.5, 2);
    const h = store().hotspots[0];
    expect(h.x).toBe(0);
    expect(h.y).toBe(1);
  });

  it('inspection hotspots get a default severity and Damage naming', () => {
    store().setMode('inspection');
    store().addHotspot(0.5, 0.5);
    const h = store().hotspots[0];
    expect(h.kind).toBe('inspection');
    expect(h.severity).toBe('medium');
    expect(h.title).toBe('Damage 1');
  });
});

describe('undo / redo', () => {
  it('undoes and redoes a background change', () => {
    store().setBackground('white');
    expect(store().backgroundId).toBe('white');

    store().undo();
    expect(store().backgroundId).toBe('transparent');

    store().redo();
    expect(store().backgroundId).toBe('white');
  });

  it('is a no-op when there is nothing to undo/redo', () => {
    store().undo();
    store().redo();
    expect(store().backgroundId).toBe('transparent');
    expect(store().dirty).toBe(false);
  });

  it('a new action after undo clears the redo stack', () => {
    store().setBackground('white');
    store().undo();
    store().setBackground('black');
    expect(store().future).toHaveLength(0);
    expect(store().backgroundId).toBe('black');
  });

  it('a drag is one undo step: beginInteraction snapshots once, moves do not', () => {
    store().addHotspot(0.2, 0.2);
    const id = store().hotspots[0].id;

    store().beginInteraction();
    store().moveHotspot(id, 0.4, 0.4);
    store().moveHotspot(id, 0.8, 0.8);
    expect(store().hotspots[0].x).toBe(0.8);

    store().undo();
    expect(store().hotspots[0].x).toBe(0.2);
  });

  it('caps history at 40 snapshots', () => {
    for (let i = 0; i < 50; i++) {
      store().setBackground(`bg-${i}`);
    }
    expect(store().past.length).toBeLessThanOrEqual(40);
  });
});

describe('plate mask', () => {
  const plate = { x: 0.4, y: 0.6, w: 0.2, h: 0.05, style: 'blur' as const };

  it('setPlate is undoable; drag is one step via beginInteraction', () => {
    store().setPlate(plate);
    expect(store().plate).toEqual(plate);

    store().beginInteraction();
    store().movePlateTo(0.7, 0.7);
    store().movePlateTo(0.8, 0.8);
    expect(store().plate?.x).not.toBe(plate.x);

    store().undo();
    expect(store().plate).toEqual(plate);
    store().undo();
    expect(store().plate).toBeUndefined();
  });

  it('patchPlate changes style without touching position', () => {
    store().setPlate(plate);
    store().patchPlate({ style: 'brand', color: '#F2F4F8' });
    expect(store().plate).toEqual({ ...plate, style: 'brand', color: '#F2F4F8' });
  });

  it('plate and pins share one selection', () => {
    store().setPlate(plate);
    store().selectPlate(true);
    expect(store().plateSelected).toBe(true);
    expect(store().selectedId).toBeNull();

    store().addHotspot(0.5, 0.5); // selects the new pin → plate deselects
    expect(store().plateSelected).toBe(false);
    expect(store().selectedId).toBe(store().hotspots[0].id);

    store().selectPlate(true);
    expect(store().selectedId).toBeNull();

    store().setPlate(undefined); // removing the plate drops its selection
    expect(store().plateSelected).toBe(false);
  });
});

describe('remove / save state', () => {
  it('removeHotspot clears the selection when the selected pin is removed', () => {
    store().addHotspot(0.5, 0.5);
    const id = store().hotspots[0].id;
    expect(store().selectedId).toBe(id);

    store().removeHotspot(id);
    expect(store().hotspots).toHaveLength(0);
    expect(store().selectedId).toBeNull();
  });

  it('markSaved clears the dirty flag without touching content', () => {
    store().addHotspot(0.5, 0.5);
    store().markSaved();
    expect(store().dirty).toBe(false);
    expect(store().hotspots).toHaveLength(1);
  });
});
