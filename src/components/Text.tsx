import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { fontFamilyForWeight } from '@/lib/fonts';
import { useLocale } from '@/lib/i18n';
import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  faint?: boolean;
  center?: boolean;
};

export function Text({ variant = 'body', color, muted, faint, center, style, ...rest }: Props) {
  const locale = useLocale();
  const resolved = color ?? (faint ? colors.textFaint : muted ? colors.textMuted : colors.text);
  // Latin text renders in Sora by naming the exact weight family (RN doesn't
  // synthesise weights for custom fonts). Arabic falls back to the system face —
  // Sora has no Arabic glyphs — and drops letter-spacing, which breaks Arabic joining.
  const { fontWeight, letterSpacing, ...typo } = typography[variant] as TextStyle;
  const script =
    locale === 'ar' ? { fontWeight } : { letterSpacing, fontFamily: fontFamilyForWeight(fontWeight) };
  return (
    <RNText
      {...rest}
      style={[typo, { color: resolved }, script, center ? { textAlign: 'center' } : null, style]}
    />
  );
}
