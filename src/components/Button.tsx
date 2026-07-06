import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { colors, glow, gradients, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHTS: Record<Size, number> = { sm: 42, md: 52, lg: 58 };
const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const fg = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.text;
  const height = HEIGHTS[size];
  const iconSize = ICON_SIZE[size];

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
          <Text variant={size === 'sm' ? 'bodyStrong' : 'bodyStrong'} color={fg}>
            {title}
          </Text>
          {iconRight ? <Icon name={iconRight} size={iconSize} color={fg} /> : null}
        </View>
      )}
    </>
  );

  const base: StyleProp<ViewStyle> = [styles.base, { height, borderRadius: radius.md }];

  if (variant === 'primary') {
    return (
      <PressableScale onPress={onPress} disabled={isDisabled} style={[isDisabled && styles.disabled, style]}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[base, glow(colors.primary, 0.35)]}
        >
          {inner}
        </LinearGradient>
      </PressableScale>
    );
  }

  const variantStyle =
    variant === 'danger'
      ? { backgroundColor: colors.danger, borderColor: colors.danger }
      : variant === 'ghost'
        ? { backgroundColor: 'transparent', borderColor: colors.border }
        : { backgroundColor: colors.surfaceAlt, borderColor: colors.border };

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      haptic={variant === 'danger' ? 'medium' : 'light'}
      style={[base, styles.bordered, variantStyle, isDisabled && styles.disabled, style]}
    >
      {inner}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  bordered: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: 0.45 },
});
