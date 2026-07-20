import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { fontFamilyForWeight } from '@/lib/fonts';
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
  const resolved = color ?? (faint ? colors.textFaint : muted ? colors.textMuted : colors.text);
  // Map the variant's weight to a Sora family and drop fontWeight — a custom
  // font renders the correct weight only when the exact family is named.
  const { fontWeight, ...typo } = typography[variant];
  return (
    <RNText
      {...rest}
      style={[
        typo,
        { color: resolved, fontFamily: fontFamilyForWeight(fontWeight) },
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
