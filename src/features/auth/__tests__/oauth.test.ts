import { parseOAuthRedirect } from '../oauth';

describe('parseOAuthRedirect', () => {
  it('reads tokens from the URL hash fragment (implicit flow)', () => {
    const r = parseOAuthRedirect('carstudio://auth-callback#access_token=abc&refresh_token=def&expires_in=3600');
    expect(r).toEqual({ ok: true, accessToken: 'abc', refreshToken: 'def' });
  });

  it('reads tokens from the query string as a fallback', () => {
    const r = parseOAuthRedirect('https://app.example.com/auth-callback?access_token=q1&refresh_token=q2');
    expect(r).toEqual({ ok: true, accessToken: 'q1', refreshToken: 'q2' });
  });

  it('surfaces error_description from the provider', () => {
    const r = parseOAuthRedirect('carstudio://auth-callback#error=access_denied&error_description=User%20cancelled');
    expect(r).toEqual({ ok: false, error: 'User cancelled' });
  });

  it('fails when the session tokens are absent', () => {
    const r = parseOAuthRedirect('carstudio://auth-callback#expires_in=3600');
    expect(r.ok).toBe(false);
  });

  it('does not throw on a malformed URL', () => {
    const r = parseOAuthRedirect('%%%not-a-url%%%#access_token=a&refresh_token=b');
    expect(r).toEqual({ ok: true, accessToken: 'a', refreshToken: 'b' });
  });
});
