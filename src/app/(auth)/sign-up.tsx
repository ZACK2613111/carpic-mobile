import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ConfigNotice } from '@/components/ConfigNotice';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { isSupabaseConfigured } from '@/lib/env';
import { useAuth } from '@/providers/AuthProvider';
import { colors, glow, gradients, radius, spacing } from '@/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter your email and a password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, name.trim() || undefined);
      if (needsConfirmation) {
        Alert.alert('Confirm your email', 'Account created. Check your inbox to confirm your email, then sign in.');
        router.replace('/sign-in');
      } else {
        // Confirmation is off: the user is already signed in — go straight in.
        // The auth guard also redirects, so this just makes the transition instant.
        router.replace('/');
      }
    } catch (e) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Please try again.');
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
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logo, glow(colors.primary, 0.5)]}
            >
              <Icon name="sparkles" size={38} color="#FFFFFF" />
            </LinearGradient>
            <Text variant="title" center>
              Create your account
            </Text>
            <Text variant="body" muted center>
              Save and sync your car photo projects.
            </Text>
          </View>

          {!isSupabaseConfigured ? <ConfigNotice /> : null}

          <View style={styles.form}>
            <TextField label="NAME (OPTIONAL)" leftIcon="user" value={name} onChangeText={setName} placeholder="Your name" />
            <TextField
              label="EMAIL"
              leftIcon="mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@dealer.com"
            />
            <TextField
              label="PASSWORD"
              leftIcon="lock"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
            />
            <Button title="Create account" size="lg" onPress={onSubmit} loading={busy} disabled={!isSupabaseConfigured} />
          </View>

          <View style={styles.row}>
            <Text variant="body" muted>
              Already have an account?{' '}
            </Text>
            <Link href="/sign-in">
              <Text variant="bodyStrong" color={colors.primary}>
                Sign in
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
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
