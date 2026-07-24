// Pure parsing for the URL an OAuth provider redirects back to. Supabase's
// implicit flow returns the session in the hash fragment (#access_token=...);
// some providers/edge cases put it on the query string. Kept pure + separate
// from the provider so it can be unit-tested without a browser or network.

export type OAuthRedirect =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; error: string };

export function parseOAuthRedirect(url: string): OAuthRedirect {
  let raw = '';
  try {
    const u = new URL(url);
    raw = (u.hash || u.search).replace(/^[#?]/, '');
  } catch {
    // Not a fully-qualified URL — fall back to the fragment/query by hand.
    raw = url.split('#')[1] ?? url.split('?')[1] ?? '';
  }
  const params = new URLSearchParams(raw);

  const error = params.get('error_description') || params.get('error');
  if (error) return { ok: false, error };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return { ok: false, error: 'No session in redirect URL' };

  return { ok: true, accessToken, refreshToken };
}
