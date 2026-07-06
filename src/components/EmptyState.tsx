import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

type Props = {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={34} color={colors.textMuted} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" muted center>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} icon="plus" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  action: { marginTop: spacing.md, alignSelf: 'stretch' },
});
