// App typeface: Montserrat — a clean geometric sans with an elegant, professional
// feel. Latin (EN/FR) renders in Montserrat; Arabic renders in Tajawal, a
// dedicated Arabic face (Montserrat has no Arabic glyphs), so العربية looks
// native instead of falling back to the system font.
//
// React Native doesn't synthesise weights for custom fonts reliably, so each
// weight is a distinct family loaded by name. `fontFamilyForWeight` maps the
// numeric weights used in `typography` to the matching family; the Text
// component sets fontFamily from it instead of relying on fontWeight.
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from '@expo-google-fonts/tajawal';
import type { TextStyle } from 'react-native';

/** Passed to `useFonts` at the root so every screen has the families available. */
export const fontAssets = {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
};

const FAMILY_BY_WEIGHT: Record<string, string> = {
  '400': 'Montserrat_400Regular',
  '500': 'Montserrat_500Medium',
  '600': 'Montserrat_600SemiBold',
  '700': 'Montserrat_700Bold',
  '800': 'Montserrat_800ExtraBold',
  normal: 'Montserrat_400Regular',
  bold: 'Montserrat_700Bold',
};

// Tajawal has no 600 weight, so SemiBold maps up to Bold.
const ARABIC_FAMILY_BY_WEIGHT: Record<string, string> = {
  '400': 'Tajawal_400Regular',
  '500': 'Tajawal_500Medium',
  '600': 'Tajawal_700Bold',
  '700': 'Tajawal_700Bold',
  '800': 'Tajawal_800ExtraBold',
  normal: 'Tajawal_400Regular',
  bold: 'Tajawal_700Bold',
};

export function fontFamilyForWeight(weight?: TextStyle['fontWeight'], arabic = false): string {
  const table = arabic ? ARABIC_FAMILY_BY_WEIGHT : FAMILY_BY_WEIGHT;
  if (weight == null) return table['400'];
  return table[String(weight)] ?? table['400'];
}

/** Convenience for non-Text Latin UI (tab labels, native inputs). */
export const fontFamily = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extrabold: 'Montserrat_800ExtraBold',
} as const;

/** Arabic (Tajawal) families for non-Text UI that switches by locale. */
export const fontFamilyArabic = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  semibold: 'Tajawal_700Bold',
  bold: 'Tajawal_700Bold',
  extrabold: 'Tajawal_800ExtraBold',
} as const;
