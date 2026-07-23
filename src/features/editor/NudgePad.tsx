import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { useT } from '@/lib/i18n';
import { colors, radius, shadow, spacing } from '@/theme';

/** One tap ≈ a hair's width — fine positioning for the selected hotspot. */
const NUDGE = 0.004;

export function NudgePad({ onNudge }: { onNudge: (dx: number, dy: number) => void }) {
  const t = useT();
  return (
    <View style={styles.pad}>
      <View style={styles.row}>
        <IconButton name="up" size={38} accessibilityLabel={t('nudge.up')} onPress={() => onNudge(0, -NUDGE)} />
      </View>
      <View style={styles.row}>
        <IconButton name="back" size={38} accessibilityLabel={t('nudge.left')} onPress={() => onNudge(-NUDGE, 0)} />
        <View style={styles.center}>
          <Icon name="crosshair" size={16} color={colors.textFaint} />
        </View>
        <IconButton name="forward" size={38} accessibilityLabel={t('nudge.right')} onPress={() => onNudge(NUDGE, 0)} />
      </View>
      <View style={styles.row}>
        <IconButton name="down" size={38} accessibilityLabel={t('nudge.down')} onPress={() => onNudge(0, NUDGE)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  center: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});
