import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

export function ConfigNotice() {
  return (
    <View style={styles.box}>
      <Text variant="label" color={colors.warning}>
        SUPABASE NOT CONFIGURED
      </Text>
      <Text variant="caption" muted>
        Copy .env.example to .env, add your Supabase URL + publishable key, then rebuild the dev client. See the
        README.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: `${colors.warning}18`,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
