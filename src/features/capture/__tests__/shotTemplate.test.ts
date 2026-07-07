import { getSlot, SHOT_TEMPLATE, slotPosition, TEMPLATE_INDEX } from '../shotTemplate';

describe('shotTemplate', () => {
  it('has unique slot ids', () => {
    const ids = SHOT_TEMPLATE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes an index that matches array order', () => {
    SHOT_TEMPLATE.forEach((slot, i) => {
      expect(TEMPLATE_INDEX[slot.id]).toBe(i);
      expect(slotPosition(slot.id)).toBe(i);
    });
  });

  it('getSlot returns the slot for a known id and undefined otherwise', () => {
    expect(getSlot('engine')?.group).toBe('engine');
    expect(getSlot('does-not-exist')).toBeUndefined();
  });

  it('slotPosition falls back to 0 for an unknown id', () => {
    expect(slotPosition('nope')).toBe(0);
  });

  it('marks only the engine slot as having audio', () => {
    const withAudio = SHOT_TEMPLATE.filter((s) => s.audio);
    expect(withAudio.map((s) => s.id)).toEqual(['engine']);
  });

  it('flags the exterior walk-around for cutout', () => {
    const exterior = SHOT_TEMPLATE.filter((s) => s.group === 'exterior');
    expect(exterior).toHaveLength(8);
    expect(exterior.every((s) => s.needsCutout)).toBe(true);
  });
});
