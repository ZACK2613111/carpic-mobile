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
import { colors, spacing } from '@/theme';

export default function EmailCode() {
  const { sendEmailCode, verifyEmailCode } = useAuth();
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSend = async () => {
    if (!isValidEmail(email)) {
      Alert.alert(t('auth.missingInfo'), t('auth.invalidEmail'));
      return;
    }
    setBusy(true);
    try {
      await sendEmailCode(email.trim());
      setSent(true);
    } catch (e) {
      Alert.alert(t('auth.codeSendFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!code.trim()) {
      Alert.alert(t('auth.missingInfo'), t('auth.codeRequired'));
      return;
    }
    setBusy(true);
    try {
      await verifyEmailCode(email.trim(), code.trim());
      router.replace('/'); // session set -> the (auth) guard also redirects
    } catch (e) {
      Alert.alert(t('auth.codeFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
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
            <Text variant="title" center>
              {t('auth.codeTitle')}
            </Text>
            <Text variant="body" muted center>
              {sent ? t('auth.codeSentSub', { email: email.trim() }) : t('auth.codeSub')}
            </Text>
          </View>

          {!sent ? (
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
                title={t('auth.sendCode')}
                size="lg"
                onPress={onSend}
                loading={busy}
                disabled={!isSupabaseConfigured}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <TextField
                label={t('auth.codeLabel')}
                leftIcon="lock"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                keyboardType="number-pad"
                placeholder="123456"
                maxLength={6}
              />
              <Button
                title={t('auth.verify')}
                size="lg"
                onPress={onVerify}
                loading={busy}
                disabled={!isSupabaseConfigured}
              />
              <View style={styles.actions}>
                <Text variant="caption" color={colors.primary} onPress={onSend}>
                  {t('auth.resendCode')}
                </Text>
                <Text
                  variant="caption"
                  muted
                  onPress={() => {
                    setSent(false);
                    setCode('');
                  }}
                >
                  {t('auth.changeEmail')}
                </Text>
              </View>
            </View>
          )}

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
  form: { gap: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
