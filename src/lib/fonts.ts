// App typeface: Sora — a modern geometric sans with a bit more character than
// the system font, while staying clean enough for a professional tool.
//
// React Native doesn't synthesise weights for custom fonts reliably, so each
// weight is a distinct family loaded by name. `fontFamilyForWeight` maps the
// numeric weights used in `typography` to the matching Sora family; the Text
// component sets fontFamily from it instead of relying on fontWeight.
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import type { TextStyle } from 'react-native';

/** Passed to `useFonts` at the root so every screen has the family available. */
export const fontAssets = {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
};

const FAMILY_BY_WEIGHT: Record<string, string> = {
  '400': 'Sora_400Regular',
  '500': 'Sora_500Medium',
  '600': 'Sora_600SemiBold',
  '700': 'Sora_700Bold',
  '800': 'Sora_800ExtraBold',
  normal: 'Sora_400Regular',
  bold: 'Sora_700Bold',
};

export function fontFamilyForWeight(weight?: TextStyle['fontWeight']): string {
  if (weight == null) return FAMILY_BY_WEIGHT['400'];
  return FAMILY_BY_WEIGHT[String(weight)] ?? FAMILY_BY_WEIGHT['400'];
}

/** Convenience for non-Text UI (tab labels, native inputs). */
export const fontFamily = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
} as const;
