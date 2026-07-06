import React, { useEffect } from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors } from '@/theme';

type Props = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height, borderRadius = 8, aspectRatio, style }: Props) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height: aspectRatio ? undefined : (height ?? 16),
          aspectRatio,
          borderRadius,
          backgroundColor: colors.surfaceAlt,
        },
        animated,
        style,
      ]}
    />
  );
}
