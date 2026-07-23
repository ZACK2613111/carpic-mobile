// Background presets rendered behind the car cutout.
// "studio" presets are drawn procedurally with Skia gradients (wall + floor +
// soft spotlight) so we get branded showroom looks with zero binary assets.
// Users can also add their own image backgrounds (stored in Supabase).

export type BackgroundPreset =
  | { id: string; name: string; kind: 'transparent' }
  | { id: string; name: string; kind: 'color'; color: string }
  | { id: string; name: string; kind: 'gradient'; colors: string[] }
  | { id: string; name: string; kind: 'studio'; wall: string; floor: string; light: string };

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'transparent', name: 'Transparent', kind: 'transparent' },
  { id: 'white', name: 'White', kind: 'color', color: '#FFFFFF' },
  { id: 'silver', name: 'Silver', kind: 'color', color: '#D7DBE0' },
  { id: 'black', name: 'Black', kind: 'color', color: '#0B0B0F' },
  { id: 'grad-ocean', name: 'Ocean', kind: 'gradient', colors: ['#1E3C72', '#2A5298'] },
  { id: 'grad-sunset', name: 'Sunset', kind: 'gradient', colors: ['#F7971E', '#FFD200'] },
  { id: 'grad-graphite', name: 'Graphite', kind: 'gradient', colors: ['#232526', '#414345'] },
  { id: 'grad-midnight', name: 'Midnight', kind: 'gradient', colors: ['#0F2027', '#2C5364'] },
  { id: 'studio-graphite', name: 'Studio Dark', kind: 'studio', wall: '#3A3F47', floor: '#0F1114', light: '#6B7686' },
  { id: 'studio-charcoal', name: 'Studio Charcoal', kind: 'studio', wall: '#2A2E35', floor: '#14171C', light: '#8A94A6' },
  { id: 'studio-showroom', name: 'Showroom', kind: 'studio', wall: '#E9EDF2', floor: '#C3CCD6', light: '#FFFFFF' },
  { id: 'studio-warm', name: 'Warm Studio', kind: 'studio', wall: '#EFE7DD', floor: '#D6CABA', light: '#FFF1DE' },
  { id: 'studio-concrete', name: 'Concrete', kind: 'studio', wall: '#B7BCC4', floor: '#8B9199', light: '#E9EDF2' },
  { id: 'studio-blue', name: 'Studio Blue', kind: 'studio', wall: '#1B2A4A', floor: '#0A1122', light: '#3E63C8' },
];

export function getBackground(id: string): BackgroundPreset {
  return BACKGROUND_PRESETS.find((b) => b.id === id) ?? BACKGROUND_PRESETS[0];
}
