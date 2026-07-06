import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { colors, hitSlop, radius } from '@/theme';

type Variant = 'surface' | 'ghost' | 'primary';
type Props = {
  name: IconName;
  onPress?: () => void;
  variant?: Variant;
  size?: number;
  disabled?: boolean;
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  name,
  onPress,
  variant = 'surface',
  size = 44,
  disabled,
  color,
  accessibilityLabel,
  style,
}: Props) {
  const bg =
    variant === 'primary' ? colors.primary : variant === 'surface' ? colors.surfaceAlt : 'transparent';
  const fg = color ?? (variant === 'primary' ? '#FFFFFF' : colors.text);
  const border = variant === 'ghost' ? 'transparent' : colors.border;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: radius.md, backgroundColor: bg, borderColor: border },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={name} size={size * 0.5} color={fg} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  disabled: { opacity: 0.4 },
});
