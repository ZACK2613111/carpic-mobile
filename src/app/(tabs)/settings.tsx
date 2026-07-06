import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { activeEngine } from '@/features/background-removal/registry';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="display">Settings</Text>

        <Section title="Account">
          <Row icon="user" label="Email" value={user?.email ?? '—'} />
        </Section>

        <Section title="Background removal">
          <Row icon="scissors" label="Engine" value={activeEngine.name} />
          <View style={styles.note}>
            <Text variant="caption" faint>
              Background removal runs entirely on your device — offline and free, with no per-image cost.
            </Text>
          </View>
        </Section>

        <Section title="About">
          <Row icon="car" label="App" value="CarStudio" />
          <Row icon="sparkles" label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
        </Section>

        <Button title="Sign out" variant="secondary" icon="logout" onPress={signOut} style={styles.signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" muted>
        {title.toUpperCase()}
      </Text>
      <View style={styles.card}>{children}</View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
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
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  note: { paddingHorizontal: spacing.xs, paddingBottom: spacing.md },
  signOut: { marginTop: spacing.sm },
});
