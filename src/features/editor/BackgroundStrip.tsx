import { ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';
import { BACKGROUND_PRESETS, type BackgroundPreset } from './backgrounds';

type Props = {
  activeId: string;
  onSelect: (id: string) => void;
};

/** Horizontal strip of background preset swatches (shared by the shot editor and the 360 screen). */
export function BackgroundStrip({ activeId, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {BACKGROUND_PRESETS.map((bg) => (
          <Swatch key={bg.id} bg={bg} active={bg.id === activeId} onPress={() => onSelect(bg.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Swatch({ bg, active, onPress }: { bg: BackgroundPreset; active: boolean; onPress: () => void }) {
  return (
    <PressableScale style={styles.swatchWrap} onPress={onPress} haptic="selection">
      <View
        style={[
          styles.swatch,
          active && styles.swatchActive,
          bg.kind === 'transparent' ? styles.swatchTransparent : { backgroundColor: previewColor(bg) },
        ]}
      >
        {bg.kind === 'transparent' ? (
          <Text variant="body" color={colors.textFaint}>
            ▨
          </Text>
        ) : null}
      </View>
      <Text variant="caption" faint={!active} color={active ? colors.text : undefined} numberOfLines={1}>
        {bg.name}
      </Text>
    </PressableScale>
  );
}

function previewColor(bg: BackgroundPreset): string {
  switch (bg.kind) {
    case 'color':
      return bg.color;
    case 'gradient':
      return bg.colors[0];
    case 'studio':
      return bg.wall;
    default:
      return colors.surfaceAlt;
  }
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.md },
  strip: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  swatchWrap: { alignItems: 'center', gap: spacing.xs, width: 62 },
  swatch: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderColor: colors.primary },
  swatchTransparent: { backgroundColor: colors.elevated },
});
