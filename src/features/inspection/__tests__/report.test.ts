import type { Hotspot } from '@/features/projects/types';
import { summarizeInspection } from '../report';

const pin = (over: Partial<Hotspot>): Hotspot => ({
  id: Math.random().toString(36).slice(2),
  kind: 'inspection',
  x: 0.5,
  y: 0.5,
  title: 'Scratch',
  ...over,
});

describe('summarizeInspection', () => {
  it('returns an empty summary for no hotspots', () => {
    const s = summarizeInspection([]);
    expect(s).toEqual({
      marketingCount: 0,
      inspectionCount: 0,
      bySeverity: { high: 0, medium: 0, low: 0 },
      items: [],
    });
  });

  it('separates marketing from inspection and counts by severity', () => {
    const s = summarizeInspection([
      {
        area: 'Front',
        hotspots: [
          pin({ kind: 'marketing', title: 'Alloy wheels', severity: undefined }),
          pin({ severity: 'high', title: 'Bumper dent' }),
          pin({ severity: 'low', title: 'Stone chip' }),
        ],
      },
      { area: '360°', hotspots: [pin({ severity: 'medium', title: 'Door scuff' })] },
    ]);
    expect(s.marketingCount).toBe(1);
    expect(s.inspectionCount).toBe(3);
    expect(s.bySeverity).toEqual({ high: 1, medium: 1, low: 1 });
  });

  it('orders items worst-first and carries the area + description', () => {
    const s = summarizeInspection([
      {
        area: 'Rear',
        hotspots: [
          pin({ severity: 'low', title: 'Minor' }),
          pin({ severity: 'high', title: 'Major', description: 'Rust' }),
          pin({ severity: 'medium', title: 'Moderate' }),
        ],
      },
    ]);
    expect(s.items.map((i) => i.severity)).toEqual(['high', 'medium', 'low']);
    expect(s.items[0]).toMatchObject({ area: 'Rear', title: 'Major', description: 'Rust' });
  });

  it('defaults a missing severity to medium', () => {
    const s = summarizeInspection([{ area: 'X', hotspots: [pin({ severity: undefined })] }]);
    expect(s.bySeverity.medium).toBe(1);
    expect(s.items[0].severity).toBe('medium');
  });
});
