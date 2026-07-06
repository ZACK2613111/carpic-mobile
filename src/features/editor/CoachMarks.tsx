import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'scissors', title: 'Cut out', body: 'Tap Cut out to remove the background instantly, on your device.' },
  { icon: 'layers', title: 'Backgrounds', body: 'Choose transparent, a color, or a studio scene from the strip.' },
  { icon: 'crosshair', title: 'Hotspots', body: 'Tap the photo to drop a pin. Drag it, or use the arrows for precision.' },
  { icon: 'zoomIn', title: 'Zoom', body: 'Pinch with two fingers to zoom in for precise placement.' },
  { icon: 'share', title: 'Export', body: 'Share your finished shot or save it to your photos.' },
];

export function CoachMarks({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={styles.overlay}>
      <View style={styles.card}>
        <Text variant="heading" center>
          Welcome to the studio ✨
        </Text>
        <View style={styles.steps}>
          {STEPS.map((s) => (
            <View key={s.title} style={styles.step}>
              <View style={styles.stepIcon}>
                <Icon name={s.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.stepText}>
                <Text variant="bodyStrong">{s.title}</Text>
                <Text variant="caption" muted>
                  {s.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Button title="Got it" icon="check" onPress={onDismiss} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 50,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 2 },
});
