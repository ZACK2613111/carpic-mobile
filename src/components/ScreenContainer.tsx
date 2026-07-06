import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type Props = {
  children: React.ReactNode;
  padded?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
};

export function ScreenContainer({
  children,
  padded = true,
  edges = ['top', 'bottom'],
  style,
}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1 },
  padded: { padding: spacing.lg },
});
