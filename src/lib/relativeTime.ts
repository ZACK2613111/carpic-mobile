// Compact, human relative time for list metadata ("2d ago", "just now").
// Intentionally dependency-free and locale-neutral so it renders identically
// on every device without pulling in Intl polyfills.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, now - then);

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < 4 * WEEK) return `${Math.floor(diff / WEEK)}w ago`;

  // Older than a month: fall back to a stable short date.
  const d = new Date(then);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return sameYear ? `${month} ${d.getDate()}` : `${month} ${d.getFullYear()}`;
}
