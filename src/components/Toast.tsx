import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, radius, shadow, spacing } from '@/theme';

type ToastType = 'success' | 'error' | 'info';
type ToastState = { message: string; type: ToastType } | null;

const ToastContext = createContext<{ show: (message: string, type?: ToastType) => void }>({
  show: () => {},
});

export const useToast = () => useContext(ToastContext);

const TYPE_META: Record<ToastType, { icon: IconName; color: string }> = {
  success: { icon: 'check', color: colors.success },
  error: { icon: 'close', color: colors.danger },
  info: { icon: 'sparkles', color: colors.primary },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const ty = useSharedValue(-140);
  const op = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id so a stale hide-animation callback can't clear a newer toast.
  const hideId = useRef(0);

  const clearIfCurrent = useCallback((theId: number) => {
    if (theId === hideId.current) setToast(null);
  }, []);

  const hide = useCallback(() => {
    const myId = ++hideId.current;
    op.value = withTiming(0, { duration: 180 });
    ty.value = withTiming(-140, { duration: 200 }, (finished) => {
      if (finished) runOnJS(clearIfCurrent)(myId);
    });
  }, [op, ty, clearIfCurrent]);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      hideId.current++; // invalidate any pending hide callback
      setToast({ message, type });
      ty.value = withTiming(0, { duration: 220 });
      op.value = withTiming(1, { duration: 220 });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, 2400);
    },
    [hide, op, ty]
  );

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }], opacity: op.value }));
  const meta = toast ? TYPE_META[toast.type] : null;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }, animated]}>
          <View style={[styles.toast, meta ? { borderColor: meta.color } : null]}>
            {meta ? <Icon name={meta.icon} size={18} color={meta.color} /> : null}
            <Text variant="bodyStrong" style={styles.msg} numberOfLines={2}>
              {toast?.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    maxWidth: '100%',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.md,
  },
  msg: { flexShrink: 1 },
});
