import Constants from 'expo-constants';
import React, { useCallback, useState } from 'react';
import { Alert, I18nManager, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { LINKS } from '@/constants/links';
import { activeEngine } from '@/features/background-removal/registry';
import { setBrand, useBrand, type WatermarkPosition } from '@/features/branding/brand';
import { setCapturePrefs, useCapturePrefs } from '@/features/capture/capturePrefs';
import { LOCALE_LABEL, LOCALES, setLocale, useLocale, useT, type Locale } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

export default function SettingsScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const brand = useBrand();
  const prefs = useCapturePrefs();
  const t = useT();
  const locale = useLocale();
  const [deleting, setDeleting] = useState(false);

  const changeLanguage = useCallback(
    (next: Locale) => {
      void setLocale(next).then(({ needsReload }) => {
        if (needsReload) Alert.alert(t('settings.restartTitle'), t('settings.restartBody'));
      });
    },
    [t]
  );

  const openLink = useCallback(
    (url: string) => {
      Linking.openURL(url).catch(() => Alert.alert(t('settings.linkFailed'), t('common.tryAgain')));
    },
    [t]
  );

  const confirmDelete = useCallback(() => {
    Alert.alert(t('settings.deleteAccount'), t('settings.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirm'),
        style: 'destructive',
        onPress: () => {
          setDeleting(true);
          // On success the auth state clears and the tabs layout redirects to
          // sign-in (this screen unmounts), so only the failure path resets.
          deleteAccount().catch((e) => {
            setDeleting(false);
            Alert.alert(t('settings.deleteAccountFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
          });
        },
      },
    ]);
  }, [deleteAccount, t]);

  const confirmSignOut = useCallback(() => {
    Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: () => {
          signOut().catch((e) => Alert.alert(t('settings.signOutFailed'), e instanceof Error ? e.message : t('common.tryAgain')));
        },
      },
    ]);
  }, [signOut, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="display">{t('settings.title')}</Text>

        <Section title={t('settings.account')}>
          <Row icon="user" label={t('settings.email')} value={user?.email ?? '—'} />
        </Section>

        <Section title={t('settings.language')}>
          <View style={styles.langBody}>
            <SegmentedControl<Locale>
              value={locale}
              onChange={changeLanguage}
              options={LOCALES.map((l) => ({ value: l, label: LOCALE_LABEL[l] }))}
            />
          </View>
        </Section>

        <Section title={t('settings.capture')}>
          <ToggleRow
            icon="bolt"
            label={t('settings.fastMode')}
            hint={t('settings.fastModeHint')}
            on={prefs.fastMode}
            onToggle={() => setCapturePrefs({ fastMode: !prefs.fastMode })}
          />
          <ToggleRow
            icon="grid"
            label={t('settings.grid')}
            hint={t('settings.gridHint')}
            on={prefs.grid}
            onToggle={() => setCapturePrefs({ grid: !prefs.grid })}
          />
          <ToggleRow
            icon="crosshair"
            label={t('settings.level')}
            hint={t('settings.levelHint')}
            on={prefs.level}
            onToggle={() => setCapturePrefs({ level: !prefs.level })}
          />
        </Section>

        <Section title={t('settings.watermark')}>
          <View style={styles.brandBody}>
            <TextField
              label={t('settings.watermarkField')}
              leftIcon="user"
              value={brand.text}
              onChangeText={(text) => setBrand({ text })}
              placeholder="e.g. 0555 12 34 56 · Auto Déclic"
              maxLength={60}
              autoCapitalize="words"
            />
            <View style={styles.brandToggleRow}>
              <Text variant="body" muted>
                {t('settings.watermarkToggle')}
              </Text>
              <Button
                title={brand.enabled ? t('common.on') : t('common.off')}
                variant={brand.enabled ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setBrand({ enabled: !brand.enabled })}
              />
            </View>
            <SegmentedControl<WatermarkPosition>
              value={brand.position}
              onChange={(position) => setBrand({ position })}
              options={[
                { value: 'bottom-left', label: t('settings.posLeft') },
                { value: 'bottom-center', label: t('settings.posCenter') },
                { value: 'bottom-right', label: t('settings.posRight') },
              ]}
            />
            <Text variant="caption" faint>
              {t('settings.watermarkNote')}
            </Text>
          </View>
        </Section>

        <Section title={t('settings.bgRemoval')}>
          <Row icon="scissors" label={t('settings.engine')} value={activeEngine.name} />
          <View style={styles.note}>
            <Text variant="caption" faint>
              {t('settings.bgRemovalNote')}
            </Text>
          </View>
        </Section>

        <Section title={t('settings.about')}>
          <Row icon="image" label={t('settings.app')} value="CarStudio" />
          <Row icon="layers" label={t('settings.version')} value={Constants.expoConfig?.version ?? '1.0.0'} />
        </Section>

        <Section title={t('settings.legal')}>
          <LinkRow icon="lock" label={t('settings.privacy')} onPress={() => openLink(LINKS.privacy)} />
          <LinkRow icon="check" label={t('settings.terms')} onPress={() => openLink(LINKS.terms)} />
          <LinkRow icon="mail" label={t('settings.support')} onPress={() => openLink(LINKS.support)} />
        </Section>

        <Button title={t('settings.signOut')} variant="secondary" icon="logout" onPress={confirmSignOut} style={styles.signOut} />
        <Button
          title={t('settings.deleteAccount')}
          variant="danger"
          icon="trash"
          onPress={confirmDelete}
          loading={deleting}
          style={styles.deleteAccount}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  // Hairline-separate stacked rows so a grouped card reads as a list, not a blob.
  const items = React.Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text variant="label" muted>
        {title.toUpperCase()}
      </Text>
      <View style={styles.card}>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.separator} /> : null}
            {child}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Icon name={icon} size={18} color={colors.textMuted} />
        </View>
        <Text variant="body" muted>
          {label}
        </Text>
      </View>
      <Text variant="bodyStrong" style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.row} onPress={onPress} haptic="selection" accessibilityRole="link">
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Icon name={icon} size={18} color={colors.textMuted} />
        </View>
        <Text variant="body">{label}</Text>
      </View>
      <Icon name="forward" size={16} color={colors.textFaint} />
    </PressableScale>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  on,
  onToggle,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Icon name={icon} size={18} color={colors.textMuted} />
        </View>
        <View style={styles.toggleText}>
          <Text variant="body">{label}</Text>
          {hint ? (
            <Text variant="caption" faint>
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
      <Button title={on ? t('common.on') : t('common.off')} variant={on ? 'primary' : 'secondary'} size="sm" onPress={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  toggleText: { flexShrink: 1, gap: 1 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowValue: { flexShrink: 1, textAlign: I18nManager.isRTL ? 'left' : 'right' },
  note: { paddingHorizontal: spacing.xs, paddingBottom: spacing.md },
  langBody: { paddingVertical: spacing.md },
  brandBody: { paddingVertical: spacing.md, gap: spacing.md },
  brandToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signOut: { marginTop: spacing.sm },
  deleteAccount: { marginTop: spacing.xs },
});
