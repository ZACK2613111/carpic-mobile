import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme';

type Props = {
  children: React.ReactNode;
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, padded = true, elevated = false, style }: Props) {
  return (
    <View style={[styles.base, padded && styles.padded, elevated && shadow.md, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.lg },
});
