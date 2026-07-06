import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptics, type HapticKind } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  scaleTo?: number;
  haptic?: HapticKind | false;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function PressableScale({
  scaleTo = 0.96,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  style,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 130 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && !disabled) haptics[haptic]();
        onPress?.(e);
      }}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
