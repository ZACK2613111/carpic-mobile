import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

// A full-screen white flash to confirm each burst-mode capture — the visual
// feedback that replaces the review gate in fast mode. Imperative so the camera
// screen can trigger it on the exact shutter frame without a re-render.

export type CaptureFlashHandle = { flash: () => void };

export const CaptureFlash = forwardRef<CaptureFlashHandle>(function CaptureFlash(_props, ref) {
  const opacity = useSharedValue(0);

  useImperativeHandle(
    ref,
    () => ({
      flash: () => {
        opacity.value = withSequence(
          withTiming(0.8, { duration: 60, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) })
        );
      },
    }),
    [opacity]
  );

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, style]} />;
});

const styles = StyleSheet.create({
  flash: { backgroundColor: '#FFFFFF' },
});
