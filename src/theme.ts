// Central design system tokens. Light, clean chrome — a professional tool on a
// white ground. (Camera viewfinders stay black; that's correct, not chrome.)
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bg: '#FFFFFF',
  bgElevated: '#FFFFFF',
  surface: '#F6F7F9',
  surfaceAlt: '#EEF0F4',
  elevated: '#FFFFFF',
  hairline: '#1114260D',
  border: '#E4E7EE',

  text: '#14151A',
  textMuted: '#5B6070',
  textFaint: '#9A9EAC',

  primary: '#3E63DD',
  primaryDim: '#2F4FC0',
  primaryText: '#FFFFFF',
  // Single restrained accent — no secondary hue. Kept equal to primary so any
  // legacy `accent` reference stays on-brand instead of reintroducing colour.
  accent: '#3E63DD',

  danger: '#E5484D',
  warning: '#E08600',
  success: '#12A150',

  // hotspot palette
  marketing: '#3E63DD',
  inspectionLow: '#E0A400',
  inspectionMedium: '#E08600',
  inspectionHigh: '#E5484D',

  overlay: 'rgba(255,255,255,0.86)',
  scrim: 'rgba(17,18,26,0.45)',
} as const;

// Gradients are deliberately flat now — a professional tool reads as solid
// surfaces, not candy. `brand` is two near-identical shades so any remaining
// use looks like a solid fill with a whisper of depth, never a rainbow.
export const gradients = {
  brand: ['#3E63DD', '#3556C9'] as [string, string],
  brandDiag: ['#3E63DD', '#2F4FC0'] as [string, string],
  hero: ['#FFFFFF', '#F6F7F9'] as [string, string],
  card: ['#FFFFFF', '#F6F7F9'] as [string, string],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

// Raw font sizes (kept for components that use them directly).
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5 },
} as const satisfies Record<string, TextStyle>;

// Soft, cool-grey shadows tuned for a white ground — depth you feel, not a
// hard black drop.
export const shadow = {
  sm: { shadowColor: '#1A2340', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#1A2340', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  lg: { shadowColor: '#1A2340', shadowOpacity: 0.14, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
} as const satisfies Record<string, ViewStyle>;

// Retained for API compatibility, but no longer a coloured "glow". Professional
// depth = a soft neutral shadow. Colour/intensity args are ignored on purpose.
export function glow(_color?: string, _intensity?: number): ViewStyle {
  return { shadowColor: '#1A2340', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 };
}

export const motion = {
  fast: 150,
  base: 220,
  slow: 340,
  spring: { damping: 18, stiffness: 200, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 130, mass: 1 },
  springBouncy: { damping: 12, stiffness: 220, mass: 0.8 },
} as const;

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 } as const;

export function severityColor(severity?: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return colors.inspectionHigh;
    case 'medium':
      return colors.inspectionMedium;
    case 'low':
    default:
      return colors.inspectionLow;
  }
}

export function hotspotColor(kind: 'marketing' | 'inspection', severity?: 'low' | 'medium' | 'high'): string {
  return kind === 'marketing' ? colors.marketing : severityColor(severity);
}
