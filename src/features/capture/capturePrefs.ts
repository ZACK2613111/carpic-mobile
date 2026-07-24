import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Persisted guided-capture preferences. Same reactive module-store pattern as
// branding/brand.ts: a single JSON blob in local storage, exposed via
// useSyncExternalStore, hydrated once at app start (loadCapturePrefs in
// _layout.tsx). No network — these are per-device shooting preferences.

export type CapturePrefs = {
  /** Burst: shutter → save locally → auto-advance, no per-shot review gate. */
  fastMode: boolean;
  /** Rule-of-thirds grid over the viewfinder. */
  grid: boolean;
  /** Live horizon / level guide (needs a device motion sensor). */
  level: boolean;
  /** Fire the shutter automatically once the phone is held level and steady. */
  autoCapture: boolean;
};

const KEY = 'capture:v1';
const DEFAULT: CapturePrefs = { fastMode: false, grid: true, level: true, autoCapture: false };

let state: CapturePrefs = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Coerce arbitrary/corrupt stored JSON into a valid CapturePrefs. */
export function coerceCapturePrefs(value: unknown): CapturePrefs {
  const o = (value && typeof value === 'object' ? value : {}) as Partial<CapturePrefs>;
  // A missing key keeps its default; a present-but-corrupt value is coerced with
  // Boolean() so storage can never yield a non-boolean.
  return {
    fastMode: o.fastMode === undefined ? DEFAULT.fastMode : Boolean(o.fastMode),
    grid: o.grid === undefined ? DEFAULT.grid : Boolean(o.grid),
    level: o.level === undefined ? DEFAULT.level : Boolean(o.level),
    autoCapture: o.autoCapture === undefined ? DEFAULT.autoCapture : Boolean(o.autoCapture),
  };
}

/** Restore persisted prefs once at app start. Safe to call repeatedly. */
export async function loadCapturePrefs(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      state = coerceCapturePrefs(JSON.parse(raw));
      emit();
    }
  } catch {
    // keep defaults — corrupt/absent prefs must never block capture
  }
}

export function getCapturePrefs(): CapturePrefs {
  return state;
}

export function setCapturePrefs(patch: Partial<CapturePrefs>): void {
  state = coerceCapturePrefs({ ...state, ...patch });
  emit();
  void AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Live capture prefs (re-renders on change). */
export function useCapturePrefs(): CapturePrefs {
  return useSyncExternalStore(subscribe, getCapturePrefs, getCapturePrefs);
}
