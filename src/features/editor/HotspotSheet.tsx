import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import type { Hotspot, Severity } from '@/features/projects/types';
import { useShotSignedUrl } from '@/features/shots/useShots';
import { useT } from '@/lib/i18n';
import { colors, hotspotColor, radius, spacing } from '@/theme';

type Props = {
  hotspot: Hotspot | null;
  onChange: (patch: Partial<Omit<Hotspot, 'id'>>) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Pick + upload a close-up photo for this hotspot; returns the storage path or null. */
  onPickPhoto?: () => Promise<string | null>;
};

export function HotspotSheet({ hotspot, onChange, onDelete, onClose, onPickPhoto }: Props) {
  const t = useT();
  const { data: photoUrl } = useShotSignedUrl(hotspot?.photoPath ?? null);
  const [busy, setBusy] = useState(false);

  const addPhoto = async () => {
    if (!onPickPhoto) return;
    setBusy(true);
    try {
      const path = await onPickPhoto();
      if (path) onChange({ photoPath: path });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={Boolean(hotspot)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            {hotspot ? (
              <View style={styles.inner}>
                <View style={styles.handle} />
                <View style={styles.headerRow}>
                  <Text variant="heading">
                    {hotspot.kind === 'marketing' ? t('hotspot.featureTitle') : t('hotspot.inspectionTitle')}
                  </Text>
                  <Chip
                    label={hotspot.kind === 'marketing' ? t('hotspot.marketing') : t('hotspot.inspection')}
                    color={hotspotColor(hotspot.kind, hotspot.severity)}
                  />
                </View>

                <TextField
                  label={t('hotspot.titleLabel')}
                  value={hotspot.title}
                  onChangeText={(text) => onChange({ title: text })}
                  placeholder={
                    hotspot.kind === 'marketing' ? t('hotspot.featurePlaceholder') : t('hotspot.inspectionPlaceholder')
                  }
                />

                <TextField
                  label={t('hotspot.detailsLabel')}
                  value={hotspot.description ?? ''}
                  onChangeText={(text) => onChange({ description: text })}
                  placeholder={t('hotspot.detailsPlaceholder')}
                  multiline
                  style={styles.multiline}
                />

                <View style={styles.section}>
                  <Text variant="label" muted>
                    {t('hotspot.photo')}
                  </Text>
                  {hotspot.photoPath ? (
                    <>
                      <View style={styles.photoPreview}>
                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.photoImg} contentFit="cover" transition={120} />
                        ) : (
                          <ActivityIndicator color={colors.primary} />
                        )}
                      </View>
                      <Button
                        title={t('hotspot.removePhoto')}
                        variant="secondary"
                        icon="trash"
                        onPress={() => onChange({ photoPath: undefined })}
                      />
                    </>
                  ) : (
                    <Button
                      title={t('hotspot.addPhoto')}
                      variant="secondary"
                      icon="image"
                      loading={busy}
                      onPress={addPhoto}
                    />
                  )}
                </View>

                {hotspot.kind === 'inspection' ? (
                  <View style={styles.section}>
                    <Text variant="label" muted>
                      {t('hotspot.severity')}
                    </Text>
                    <SegmentedControl<Severity>
                      value={hotspot.severity ?? 'medium'}
                      onChange={(v) => onChange({ severity: v })}
                      options={[
                        { value: 'low', label: t('hotspot.low'), color: colors.inspectionLow },
                        { value: 'medium', label: t('hotspot.medium'), color: colors.inspectionMedium },
                        { value: 'high', label: t('hotspot.high'), color: colors.inspectionHigh },
                      ]}
                    />
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Button title={t('hotspot.delete')} variant="danger" icon="trash" onPress={onDelete} style={styles.flex} />
                  <Button title={t('hotspot.done')} icon="check" onPress={onClose} style={styles.flex} />
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
  photoPreview: {
    width: '100%',
    height: 132,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImg: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  flex: { flex: 1 },
});
