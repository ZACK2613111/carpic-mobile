import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

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
  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: resolved }, center ? { textAlign: 'center' } : null, style]}
    />
  );
}
