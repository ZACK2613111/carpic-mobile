// Lightweight, dependency-free input validators.

/**
 * Pragmatic email check: one @, a dotted domain, no spaces. Deliberately not
 * RFC-perfect — it just catches the obvious typos before we hit the auth API.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
