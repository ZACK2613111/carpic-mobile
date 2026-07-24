import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/Text';
import type { SocialProvider } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

// Brand marks kept out of the monochrome Icon set: Google is multicolor and
// Microsoft is four colored squares, neither of which fits a single-stroke icon.
function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </Svg>
  );
}

function AppleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill={colors.text}
        d="M17.05 12.53c-.03-2.9 2.37-4.29 2.48-4.36-1.35-1.98-3.46-2.25-4.21-2.28-1.79-.18-3.5 1.05-4.41 1.05-.91 0-2.31-1.03-3.8-1-1.96.03-3.77 1.14-4.78 2.9-2.04 3.54-.52 8.78 1.46 11.65.97 1.4 2.12 2.98 3.63 2.92 1.46-.06 2.01-.94 3.77-.94 1.76 0 2.26.94 3.8.91 1.57-.03 2.56-1.43 3.52-2.84 1.11-1.63 1.57-3.21 1.59-3.29-.03-.02-3.05-1.17-3.08-4.64z"
      />
      <Path
        fill={colors.text}
        d="M14.13 4.15c.81-.98 1.35-2.35 1.2-3.71-1.16.05-2.57.77-3.4 1.75-.75.87-1.4 2.26-1.23 3.59 1.29.1 2.62-.66 3.43-1.63z"
      />
    </Svg>
  );
}

function MicrosoftMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Rect x={1} y={1} width={10} height={10} fill="#F25022" />
      <Rect x={13} y={1} width={10} height={10} fill="#7FBA00" />
      <Rect x={1} y={13} width={10} height={10} fill="#00A4EF" />
      <Rect x={13} y={13} width={10} height={10} fill="#FFB900" />
    </Svg>
  );
}

const MARKS: Record<SocialProvider, () => React.ReactElement> = {
  google: GoogleMark,
  apple: AppleMark,
  azure: MicrosoftMark,
};

type Props = {
  provider: SocialProvider;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SocialButton({ provider, label, onPress, disabled, style }: Props) {
  const Mark = MARKS[provider];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <View style={styles.mark}>
        <Mark />
      </View>
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  mark: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
});
