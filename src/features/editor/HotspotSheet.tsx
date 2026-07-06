import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import type { Hotspot, Severity } from '@/features/projects/types';
import { colors, hotspotColor, radius, spacing } from '@/theme';

type Props = {
  hotspot: Hotspot | null;
  onChange: (patch: Partial<Omit<Hotspot, 'id'>>) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function HotspotSheet({ hotspot, onChange, onDelete, onClose }: Props) {
  return (
    <Modal visible={Boolean(hotspot)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            {hotspot ? (
              <View style={styles.inner}>
                <View style={styles.handle} />
                <View style={styles.headerRow}>
                  <Text variant="heading">
                    {hotspot.kind === 'marketing' ? 'Feature hotspot' : 'Inspection point'}
                  </Text>
                  <Chip
                    label={hotspot.kind === 'marketing' ? 'Marketing' : 'Inspection'}
                    color={hotspotColor(hotspot.kind, hotspot.severity)}
                  />
                </View>

                <TextField
                  label="TITLE"
                  value={hotspot.title}
                  onChangeText={(t) => onChange({ title: t })}
                  placeholder={hotspot.kind === 'marketing' ? 'e.g. Panoramic roof' : 'e.g. Front bumper scratch'}
                />

                <TextField
                  label="DESCRIPTION"
                  value={hotspot.description ?? ''}
                  onChangeText={(t) => onChange({ description: t })}
                  placeholder="Optional details"
                  multiline
                  style={styles.multiline}
                />

                {hotspot.kind === 'inspection' ? (
                  <View style={styles.section}>
                    <Text variant="label" muted>
                      SEVERITY
                    </Text>
                    <SegmentedControl<Severity>
                      value={hotspot.severity ?? 'medium'}
                      onChange={(v) => onChange({ severity: v })}
                      options={[
                        { value: 'low', label: 'Low', color: colors.inspectionLow },
                        { value: 'medium', label: 'Medium', color: colors.inspectionMedium },
                        { value: 'high', label: 'High', color: colors.inspectionHigh },
                      ]}
                    />
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Button title="Delete" variant="danger" icon="trash" onPress={onDelete} style={styles.flex} />
                  <Button title="Done" icon="check" onPress={onClose} style={styles.flex} />
                </View>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  inner: { gap: spacing.md, paddingBottom: spacing.md },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  section: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  flex: { flex: 1 },
});
