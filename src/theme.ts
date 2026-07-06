// Central design system tokens. Dark-first — a photo studio looks best on dark chrome.
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bg: '#0A0A0F',
  bgElevated: '#111119',
  surface: '#15151F',
  surfaceAlt: '#1C1C28',
  elevated: '#232331',
  hairline: '#26263340',
  border: '#2E2E3C',

  text: '#F6F7FB',
  textMuted: '#A2A3B2',
  textFaint: '#6C6D7E',

  primary: '#4B7BFF',
  primaryDim: '#3660D8',
  primaryText: '#FFFFFF',
  accent: '#8B5CFF',

  danger: '#FF5A5A',
  warning: '#FFB020',
  success: '#2ED47A',

  // hotspot palette
  marketing: '#4B7BFF',
  inspectionLow: '#FFD23A',
  inspectionMedium: '#FFA83A',
  inspectionHigh: '#FF5A5A',

  overlay: 'rgba(6,6,10,0.72)',
  scrim: 'rgba(0,0,0,0.5)',
} as const;

export const gradients = {
  brand: ['#4B7BFF', '#8B5CFF'] as [string, string],
  brandDiag: ['#3660D8', '#8B5CFF'] as [string, string],
  hero: ['#141430', '#0A0A0F'] as [string, string],
  card: ['#1A1A28', '#141420'] as [string, string],
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
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
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

export const shadow = {
  sm: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  md: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  lg: { shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 14 },
} as const satisfies Record<string, ViewStyle>;

export function glow(color: string, intensity = 0.5): ViewStyle {
  return { shadowColor: color, shadowOpacity: intensity, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 };
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
