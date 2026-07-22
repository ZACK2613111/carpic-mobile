import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { PlateMask, PlateStyle } from '@/features/projects/types';
import { haptics } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { colors, spacing } from '@/theme';
import { useEditorStore } from './editorStore';
import { PLATE_BRAND_COLORS } from './plateMask';

/** Style row for the selected plate mask: blur/brand, brand color, remove. */
export function PlateControls({ plate }: { plate: PlateMask }) {
  const patchPlate = useEditorStore((s) => s.patchPlate);
  const setPlate = useEditorStore((s) => s.setPlate);
  const t = useT();

  return (
    <View style={styles.row}>
      <View style={styles.seg}>
        <SegmentedControl<PlateStyle>
          value={plate.style}
          onChange={(v) => patchPlate({ style: v })}
          options={[
            { value: 'blur', label: t('plate.blur') },
            { value: 'brand', label: t('plate.branded') },
          ]}
        />
      </View>
      {plate.style === 'brand'
        ? PLATE_BRAND_COLORS.map((c) => (
            <PressableScale
              key={c}
              style={[
                styles.colorChip,
                { backgroundColor: c },
                (plate.color ?? PLATE_BRAND_COLORS[0]) === c ? styles.colorChipOn : null,
              ]}
              onPress={() => patchPlate({ color: c })}
              haptic="selection"
              accessibilityLabel={t('plate.colorLabel', { color: c })}
            />
          ))
        : null}
      <IconButton
        name="trash"
        variant="ghost"
        size={36}
        accessibilityLabel={t('plate.remove')}
        onPress={() => {
          haptics.medium();
          setPlate(undefined);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  seg: { flex: 1 },
  colorChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorChipOn: { borderColor: colors.primary },
});
