import { isRTL, translate } from '../index';
import { LOCALES, messages, type MessageKey } from '../messages';

describe('i18n messages', () => {
  const keys = Object.keys(messages.en) as MessageKey[];

  it('has a non-empty string for every key in every locale', () => {
    for (const locale of LOCALES) {
      for (const key of keys) {
        const value = messages[locale][key];
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('translate returns the locale value for a known key', () => {
    expect(translate('en', 'auth.signIn')).toBe('Sign in');
    expect(translate('fr', 'auth.signIn')).toBe('Se connecter');
    expect(translate('ar', 'auth.signIn')).toBe(messages.ar['auth.signIn']);
  });

  it('interpolates named params without crashing on plain strings', () => {
    // No current string uses params, but the path must be a safe no-op.
    expect(translate('en', 'settings.title', { unused: 1 })).toBe('Settings');
  });
});

describe('i18n direction', () => {
  it('flags Arabic as RTL and the Latin locales as LTR', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
    expect(isRTL('fr')).toBe(false);
  });
});
