import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured } from '@/lib/env';
import { useT } from '@/lib/i18n';
import { isValidEmail } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t('auth.missingInfo'), t('auth.emailRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert(t('auth.missingInfo'), t('auth.invalidEmail'));
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      // Same message whether or not the account exists — never reveal which
      // emails are registered.
      Alert.alert(t('auth.resetSentTitle'), t('auth.resetSentBody'));
      router.replace('/sign-in');
    } catch (e) {
      Alert.alert(t('auth.resetFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Image source={require('../../../assets/images/icon.png')} style={styles.logo} contentFit="cover" />
            <Text variant="title" center>
              {t('auth.forgotTitle')}
            </Text>
            <Text variant="body" muted center>
              {t('auth.forgotSub')}
            </Text>
          </View>

          <View style={styles.form}>
            <TextField
              label={t('auth.email')}
              leftIcon="mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@dealer.com"
            />
            <Button
              title={t('auth.sendReset')}
              size="lg"
              onPress={onSubmit}
              loading={busy}
              disabled={!isSupabaseConfigured}
            />
          </View>

          <View style={styles.row}>
            <Link href="/sign-in">
              <Text variant="bodyStrong" color={colors.primary}>
                {t('auth.signIn')}
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  logo: { width: 64, height: 64, borderRadius: radius.lg, marginBottom: spacing.sm },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
