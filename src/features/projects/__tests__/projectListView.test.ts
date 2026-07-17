import type { Project } from '../types';
import { filterAndSortProjects, filterProjects, isPublished, sortProjects } from '../projectListView';

const make = (over: Partial<Project>): Project =>
  ({
    id: Math.random().toString(36).slice(2),
    user_id: 'u',
    name: 'Car',
    mode: 'marketing',
    background_id: 'transparent',
    doc: { version: 1, hotspots: [] },
    original_path: null,
    cutout_path: null,
    export_path: null,
    thumb_path: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  }) as Project;

describe('filterProjects', () => {
  const list = [
    make({ name: 'Clio blanche', vin: 'VF1RFB00000000001' }), // Renault
    make({ name: 'Golf 7', vin: 'WVWZZZ1KZAW000001' }), // Volkswagen
    make({ name: 'Tucson', vin: null }),
  ];

  it('returns everything for a blank query', () => {
    expect(filterProjects(list, '   ')).toHaveLength(3);
  });

  it('matches by name', () => {
    expect(filterProjects(list, 'golf').map((p) => p.name)).toEqual(['Golf 7']);
  });

  it('matches by decoded make from the VIN', () => {
    expect(filterProjects(list, 'renault').map((p) => p.name)).toEqual(['Clio blanche']);
    expect(filterProjects(list, 'volkswagen').map((p) => p.name)).toEqual(['Golf 7']);
  });

  it('requires all terms to match (AND)', () => {
    expect(filterProjects(list, 'clio renault')).toHaveLength(1);
    expect(filterProjects(list, 'clio golf')).toHaveLength(0);
  });
});

describe('sortProjects', () => {
  const list = [
    make({ name: 'Zoe', updated_at: '2026-05-01' }),
    make({ name: 'Astra', updated_at: '2026-06-01' }),
  ];

  it('sorts by name case-insensitively', () => {
    expect(sortProjects(list, 'name').map((p) => p.name)).toEqual(['Astra', 'Zoe']);
  });

  it('sorts recent by updated_at desc', () => {
    expect(sortProjects(list, 'recent').map((p) => p.name)).toEqual(['Astra', 'Zoe']);
  });

  it('does not mutate the input array', () => {
    const before = list.map((p) => p.name);
    sortProjects(list, 'name');
    expect(list.map((p) => p.name)).toEqual(before);
  });
});

describe('filterAndSortProjects', () => {
  it('filters then sorts', () => {
    const list = [
      make({ name: 'Beta', vin: null }),
      make({ name: 'Alpha', vin: null }),
      make({ name: 'Gamma car', vin: null }),
    ];
    expect(filterAndSortProjects(list, { query: 'a', sort: 'name' }).map((p) => p.name)).toEqual([
      'Alpha',
      'Beta',
      'Gamma car',
    ]);
  });
});

describe('isPublished', () => {
  it('is true with a published status or a live url', () => {
    expect(isPublished(make({ status: 'published' }))).toBe(true);
    expect(isPublished(make({ published_url: 'https://x' }))).toBe(true);
    expect(isPublished(make({ status: 'draft' }))).toBe(false);
  });
});
