import { Image } from 'expo-image';
import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ConfigNotice } from '@/components/ConfigNotice';
import { SocialButton } from '@/components/SocialButton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured } from '@/lib/env';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/lib/i18n';
import { isValidEmail } from '@/lib/validation';
import { useAuth, type SocialProvider } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

export default function SignIn() {
  const { signIn, signInWithProvider } = useAuth();
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert(t('auth.missingInfo'), t('auth.enterEmailPassword'));
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert(t('auth.missingInfo'), t('auth.invalidEmail'));
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e) {
      Alert.alert(t('auth.signInFailed'), errorMessage(e, t('common.tryAgain')));
    } finally {
      setBusy(false);
    }
  };

  const onSocial = async (provider: SocialProvider) => {
    setBusy(true);
    try {
      const ok = await signInWithProvider(provider);
      if (ok) router.replace('/');
    } catch (e) {
      Alert.alert(t('auth.signInFailed'), errorMessage(e, t('common.tryAgain')));
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
            <Text variant="title">CarStudio</Text>
            <Text variant="body" muted center>
              {t('auth.tagline')}
            </Text>
          </View>

          {!isSupabaseConfigured ? <ConfigNotice /> : null}

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
            <TextField
              label={t('auth.password')}
              leftIcon="lock"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            <View style={styles.forgotRow}>
              <Link href="/forgot-password">
                <Text variant="caption" color={colors.primary}>
                  {t('auth.forgotLink')}
                </Text>
              </Link>
            </View>
            <Button title={t('auth.signIn')} size="lg" onPress={onSubmit} loading={busy} disabled={!isSupabaseConfigured} />
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text variant="caption" muted>
              {t('auth.orContinueWith')}
            </Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socials}>
            <SocialButton
              provider="google"
              label={t('auth.continueGoogle')}
              onPress={() => onSocial('google')}
              disabled={!isSupabaseConfigured || busy}
            />
            <SocialButton
              provider="apple"
              label={t('auth.continueApple')}
              onPress={() => onSocial('apple')}
              disabled={!isSupabaseConfigured || busy}
            />
            <SocialButton
              provider="azure"
              label={t('auth.continueMicrosoft')}
              onPress={() => onSocial('azure')}
              disabled={!isSupabaseConfigured || busy}
            />
            <View style={styles.codeRow}>
              {/* cast: typed-routes regenerate on the next `expo start`; the route file exists */}
              <Link href={'/email-code' as Href}>
                <Text variant="bodyStrong" color={colors.primary}>
                  {t('auth.codeLink')}
                </Text>
              </Link>
            </View>
          </View>

          <View style={styles.row}>
            <Text variant="body" muted>
              {t('auth.noAccount')}{' '}
            </Text>
            <Link href="/sign-up">
              <Text variant="bodyStrong" color={colors.primary}>
                {t('auth.createOne')}
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
  forgotRow: { alignItems: 'flex-end', marginTop: -spacing.xs },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  socials: { gap: spacing.sm },
  codeRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
