import type { Hotspot, Severity } from '@/features/projects/types';

// Turns scattered inspection pins (across every shot + the 360 spin) into a
// structured condition report. Pure and app-agnostic — the caller supplies
// area-labelled groups, so this same summary powers the in-app dashboard card
// and the buyer-facing published viewer. On a used-car market, an honest,
// legible condition report is a trust lever, not a nice-to-have.

export type HotspotGroup = { area: string; hotspots: Hotspot[] };

export type InspectionItem = {
  area: string;
  title: string;
  severity: Severity;
  description?: string;
};

export type InspectionSummary = {
  marketingCount: number;
  inspectionCount: number;
  bySeverity: { high: number; medium: number; low: number };
  /** Inspection items only, worst-first. */
  items: InspectionItem[];
};

const RANK: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

export function summarizeInspection(groups: HotspotGroup[]): InspectionSummary {
  let marketingCount = 0;
  const bySeverity = { high: 0, medium: 0, low: 0 };
  const items: InspectionItem[] = [];

  for (const group of groups) {
    for (const h of group.hotspots) {
      if (h.kind === 'inspection') {
        const severity: Severity = h.severity ?? 'medium';
        bySeverity[severity] += 1;
        items.push({ area: group.area, title: h.title, severity, description: h.description });
      } else {
        marketingCount += 1;
      }
    }
  }

  // Worst-first; stable within a severity so capture order is preserved.
  items.sort((a, b) => RANK[b.severity] - RANK[a.severity]);

  return { marketingCount, inspectionCount: items.length, bySeverity, items };
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'Major',
  medium: 'Moderate',
  low: 'Minor',
};
