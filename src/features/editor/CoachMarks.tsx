import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useT, type MessageKey } from '@/lib/i18n';
import { colors, radius, spacing } from '@/theme';

const STEPS: { icon: IconName; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  { icon: 'scissors', titleKey: 'coach.cutoutTitle', bodyKey: 'coach.cutoutBody' },
  { icon: 'layers', titleKey: 'coach.bgTitle', bodyKey: 'coach.bgBody' },
  { icon: 'crosshair', titleKey: 'coach.hotspotsTitle', bodyKey: 'coach.hotspotsBody' },
  { icon: 'zoomIn', titleKey: 'coach.zoomTitle', bodyKey: 'coach.zoomBody' },
  { icon: 'share', titleKey: 'coach.exportTitle', bodyKey: 'coach.exportBody' },
];

export function CoachMarks({ onDismiss }: { onDismiss: () => void }) {
  const t = useT();
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={styles.overlay}>
      <View style={styles.card}>
        <Text variant="heading" center>
          {t('coach.welcome')}
        </Text>
        <View style={styles.steps}>
          {STEPS.map((s) => (
            <View key={s.titleKey} style={styles.step}>
              <View style={styles.stepIcon}>
                <Icon name={s.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.stepText}>
                <Text variant="bodyStrong">{t(s.titleKey)}</Text>
                <Text variant="caption" muted>
                  {t(s.bodyKey)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Button title={t('coach.gotIt')} icon="check" onPress={onDismiss} />
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
