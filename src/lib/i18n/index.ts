// Lightweight i18n: a typed message table + a Zustand-backed current locale, no
// heavy runtime dependency (APK size matters on the low-end Android we target).
// `expo-localization` is used only to read the device language once at startup.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import { create } from 'zustand';

import { LOCALES, RTL_LOCALES, messages, type Locale, type MessageKey } from './messages';

export { LOCALES, LOCALE_LABEL, RTL_LOCALES } from './messages';
export type { Locale, MessageKey } from './messages';

const STORAGE_KEY = 'app:locale';
const FALLBACK: Locale = 'en';

function isLocale(value: string | null | undefined): value is Locale {
  return value != null && (LOCALES as string[]).includes(value);
}

export function isRTL(locale: Locale): boolean {
  return (RTL_LOCALES as string[]).includes(locale);
}

/** First supported device language, else English. Guarded so it is safe at import time (and under Jest). */
function detectDeviceLocale(): Locale {
  try {
    for (const l of Localization.getLocales()) {
      const code = l.languageCode?.toLowerCase();
      if (isLocale(code)) return code;
    }
  } catch {
    // no-op: fall through to the default
  }
  return FALLBACK;
}

type LocaleState = { locale: Locale; setLocaleState: (l: Locale) => void };
const useLocaleStore = create<LocaleState>((set) => ({
  // Best-effort synchronous default so the very first frame is already in the
  // device language; initI18n() then applies any persisted override.
  locale: detectDeviceLocale(),
  setLocaleState: (locale) => set({ locale }),
}));

/** Pure translator — used by both the hook and the standalone `t`. */
export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  let s = messages[locale]?.[key] ?? messages[FALLBACK][key] ?? key;
  if (params) {
    for (const name of Object.keys(params)) {
      s = s.replace(new RegExp(`\\{${name}\\}`, 'g'), String(params[name]));
    }
  }
  return s;
}

/** Standalone translator for non-React code (reads the current locale). */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translate(useLocaleStore.getState().locale, key, params);
}

/** React hook: re-renders on locale change. */
export function useT(): (key: MessageKey, params?: Record<string, string | number>) => string {
  const locale = useLocaleStore((s) => s.locale);
  return (key, params) => translate(locale, key, params);
}

export function useLocale(): Locale {
  return useLocaleStore((s) => s.locale);
}

// Keep the native layout direction in sync. RN only re-lays-out after a reload,
// so this returns whether a direction flip is pending.
function applyDirection(locale: Locale): boolean {
  I18nManager.allowRTL(true);
  const shouldRTL = isRTL(locale);
  if (I18nManager.isRTL !== shouldRTL) {
    I18nManager.forceRTL(shouldRTL);
    return true;
  }
  return false;
}

/** Load the persisted locale (falling back to device) and sync text direction. Call once at startup. */
export async function initI18n(): Promise<void> {
  let locale = detectDeviceLocale();
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) locale = stored;
  } catch {
    // ignore storage errors — device locale is a fine default
  }
  applyDirection(locale);
  useLocaleStore.getState().setLocaleState(locale);
}

/** Switch language, persist it, and report whether the app must reload for the text direction to apply. */
export async function setLocale(locale: Locale): Promise<{ needsReload: boolean }> {
  const needsReload = applyDirection(locale);
  useLocaleStore.getState().setLocaleState(locale);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // a failed persist is non-fatal; the in-memory switch still took effect
  }
  return { needsReload };
}
