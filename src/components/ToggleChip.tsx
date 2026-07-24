import React from 'react';
import { StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

/** Small pill toggle (icon + label) for background / shadow / plate switches. */
export function ToggleChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale style={[styles.chip, active ? styles.chipOn : null]} onPress={onPress}>
      <Icon name={icon} size={16} color={active ? colors.primary : colors.textMuted} />
      <Text variant="label" color={active ? colors.primary : colors.textMuted}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: `${colors.primary}18` },
});
