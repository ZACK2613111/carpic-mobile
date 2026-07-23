import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { fontFamily } from '@/lib/fonts';
import { useLocale } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

type Props = TextInputProps & {
  label?: string;
  leftIcon?: IconName;
};

export function TextField({ label, leftIcon, style, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const locale = useLocale();

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" muted>
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {leftIcon ? (
          <Icon name={leftIcon} size={18} color={focused ? colors.primary : colors.textFaint} />
        ) : null}
        <TextInput
          placeholderTextColor={colors.textFaint}
          style={[styles.input, { fontFamily: locale === 'ar' ? undefined : fontFamily.regular }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  fieldFocused: { borderColor: colors.primary },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
    ...typography.body,
    fontWeight: undefined,
  },
});
