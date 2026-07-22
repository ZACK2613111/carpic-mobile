import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ConfigNotice } from '@/components/ConfigNotice';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured } from '@/lib/env';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

export default function SignIn() {
  const { signIn } = useAuth();
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
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e) {
      Alert.alert(t('auth.signInFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
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
            <Button title={t('auth.signIn')} size="lg" onPress={onSubmit} loading={busy} disabled={!isSupabaseConfigured} />
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
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
