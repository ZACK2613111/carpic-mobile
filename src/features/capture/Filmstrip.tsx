import { Image } from 'expo-image';
import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { SHOT_TEMPLATE, type ShotSlot } from '@/features/capture/shotTemplate';
import type { Shot } from '@/features/shots/types';
import { useShotSignedUrl } from '@/features/shots/useShots';
import { colors, radius, spacing } from '@/theme';

type Props = {
  bySlot: Record<string, Shot>;
  /** slot id → local outbox file uri, for captures not yet synced. */
  pendingUriBySlot: Record<string, string>;
  currentIndex: number;
  onJump: (index: number) => void;
};

// Live thumbnail strip of the whole shot list. Lets the shooter see the set
// fill up during a burst and tap any frame to jump back and re-shoot it —
// without leaving the camera.
export function Filmstrip({ bySlot, pendingUriBySlot, currentIndex, onJump }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      keyboardShouldPersistTaps="handled"
    >
      {SHOT_TEMPLATE.map((slot, i) => (
        <StripCell
          key={slot.id}
          slot={slot}
          index={i}
          shot={bySlot[slot.id]}
          pendingUri={pendingUriBySlot[slot.id] ?? null}
          active={i === currentIndex}
          onPress={() => onJump(i)}
        />
      ))}
    </ScrollView>
  );
}

const StripCell = memo(function StripCell({
  slot,
  index,
  shot,
  pendingUri,
  active,
  onPress,
}: {
  slot: ShotSlot;
  index: number;
  shot?: Shot;
  pendingUri: string | null;
  active: boolean;
  onPress: () => void;
}) {
  // One signed-url query per slot — shared cache key with the dashboard tiles.
  const { data: url } = useShotSignedUrl(shot?.captured ? (shot.cutout_path ?? shot.image_path) : null);
  const displayUri = url ?? (!shot?.captured ? pendingUri : null);
  const isPending = !shot?.captured && Boolean(pendingUri);

  return (
    <PressableScale
      style={[styles.cell, active && styles.cellActive]}
      onPress={onPress}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={`${slot.label}, ${shot?.captured ? 'captured' : isPending ? 'uploading' : 'empty'}`}
    >
      {displayUri ? (
        <Image
          source={{ uri: displayUri }}
          style={styles.img}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          recyclingKey={slot.id}
        />
      ) : (
        <Text variant="caption" color={active ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}>
          {index + 1}
        </Text>
      )}
      {shot?.captured ? (
        <View style={styles.badge}>
          <Icon name="check" size={11} color="#FFFFFF" />
        </View>
      ) : isPending ? (
        <View style={[styles.badge, styles.badgePending]}>
          <Icon name="up" size={11} color="#FFFFFF" />
        </View>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  strip: { gap: spacing.xs, paddingHorizontal: spacing.xs, alignItems: 'center' },
  cell: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,24,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderWidth: 2, borderColor: colors.primary },
  img: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 2,
    end: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePending: { backgroundColor: colors.primary },
});
