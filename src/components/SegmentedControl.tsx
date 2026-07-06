import React, { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { colors, motion, radius } from '@/theme';

const PAD = 4;

export type SegOption<T extends string> = {
  value: T;
  label: string;
  icon?: IconName;
  color?: string;
};

type Props<T extends string> = {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const [width, setWidth] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = width > 0 ? (width - PAD * 2) / options.length : 0;
  const tx = useSharedValue(0);

  useEffect(() => {
    tx.value = withSpring(idx * seg, motion.spring);
  }, [idx, seg, tx]);

  const highlight = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }], width: seg }));
  const active = options[idx];

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {seg > 0 ? (
        <Animated.View
          style={[styles.highlight, { backgroundColor: active?.color ?? colors.primary }, highlight]}
        />
      ) : null}
      {options.map((o) => {
        const isActive = o.value === value;
        const fg = isActive ? '#FFFFFF' : colors.textMuted;
        return (
          <Pressable
            key={o.value}
            style={styles.seg}
            onPress={() => {
              if (!isActive) {
                haptics.selection();
                onChange(o.value);
              }
            }}
          >
            {o.icon ? <Icon name={o.icon} size={16} color={fg} /> : null}
            <Text variant="bodyStrong" color={fg}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: PAD,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlight: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.sm },
  seg: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
});
