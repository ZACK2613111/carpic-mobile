import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

type Props = {
  label: string;
  color?: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, color = colors.primary, filled = true, style }: Props) {
  return (
    <View
      style={[
        styles.base,
        filled
          ? { backgroundColor: color }
          : { backgroundColor: `${color}22`, borderColor: color, borderWidth: 1 },
        style,
      ]}
    >
      <Text variant="label" color={filled ? '#FFFFFF' : color}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
