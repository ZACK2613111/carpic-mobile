import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Seller branding / watermark. On Algerian marketplaces (Ouedkniss, Facebook)
// photo theft is rampant — dealers want their phone/name burned into every
// image. It's a per-account brand, set once, applied to exports and the
// published link, so it lives in local storage (not per-shot).

export type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'bottom-center';

export type BrandConfig = {
  /** Phone number or dealer name — the text stamped on the photo. */
  text: string;
  enabled: boolean;
  position: WatermarkPosition;
};

const KEY = 'brand:v1';
const MAX_TEXT = 60;
const DEFAULT: BrandConfig = { text: '', enabled: false, position: 'bottom-right' };

let state: BrandConfig = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function coerceBrand(value: unknown): BrandConfig {
  const o = (value && typeof value === 'object' ? value : {}) as Partial<BrandConfig>;
  const position: WatermarkPosition =
    o.position === 'bottom-left' || o.position === 'bottom-center' ? o.position : 'bottom-right';
  return {
    text: typeof o.text === 'string' ? o.text.slice(0, MAX_TEXT) : '',
    enabled: Boolean(o.enabled),
    position,
  };
}

/** Restore the persisted brand once at app start. Safe to call repeatedly. */
export async function loadBrand(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      state = coerceBrand(JSON.parse(raw));
      emit();
    }
  } catch {
    // keep defaults — a corrupt/absent brand must never block the app
  }
}

export function getBrand(): BrandConfig {
  return state;
}

export function setBrand(patch: Partial<BrandConfig>): void {
  state = coerceBrand({ ...state, ...patch });
  emit();
  void AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Live brand config (re-renders on change). */
export function useBrand(): BrandConfig {
  return useSyncExternalStore(subscribe, getBrand, getBrand);
}

/** A watermark only shows when it's enabled AND there's actual text to stamp. */
export function watermarkVisible(b: BrandConfig): boolean {
  return b.enabled && b.text.trim().length > 0;
}

export type WatermarkAnchor = { x: number; y: number; align: 'left' | 'center' | 'right' };

/** Baseline anchor + horizontal alignment for the watermark, in canvas pixels. */
export function watermarkAnchor(
  position: WatermarkPosition,
  width: number,
  height: number,
  margin: number
): WatermarkAnchor {
  const y = height - margin;
  if (position === 'bottom-left') return { x: margin, y, align: 'left' };
  if (position === 'bottom-center') return { x: width / 2, y, align: 'center' };
  return { x: width - margin, y, align: 'right' };
}
