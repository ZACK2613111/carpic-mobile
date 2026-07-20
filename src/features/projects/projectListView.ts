import { decodeVin } from '@/features/vehicle/vin';
import type { Project } from './types';

// Search + sort for the projects grid. As a dealer's studio grows to dozens of
// cars, finding one fast matters. Pure so it's unit-tested and reused anywhere.
// Search matches the name AND the VIN — including its DECODED make/year — so
// "renault" or "2018" finds the car even when the name is just a plate number.

export type SortMode = 'recent' | 'name';

function haystack(p: Project): string {
  const parts = [p.name];
  if (p.vin) {
    parts.push(p.vin);
    const info = decodeVin(p.vin);
    if (info.make) parts.push(info.make);
    if (info.year) parts.push(String(info.year));
    if (info.region) parts.push(info.region);
  }
  return parts.join(' ').toLowerCase();
}

export function filterProjects(projects: Project[], query: string): Project[] {
  const q = query.trim().toLowerCase();
  if (!q) return projects;
  // Every whitespace-separated term must match (AND) — narrows as you type.
  const terms = q.split(/\s+/);
  return projects.filter((p) => {
    const hay = haystack(p);
    return terms.every((t) => hay.includes(t));
  });
}

export function sortProjects(projects: Project[], mode: SortMode): Project[] {
  const copy = [...projects];
  if (mode === 'name') {
    return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
  // recent: newest updated first
  return copy.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
}

export function filterAndSortProjects(
  projects: Project[],
  opts: { query: string; sort: SortMode }
): Project[] {
  return sortProjects(filterProjects(projects, opts.query), opts.sort);
}

/** A project is "published" once it has a live shareable link. */
export function isPublished(p: Project): boolean {
  return p.status === 'published' || Boolean(p.published_url);
}
