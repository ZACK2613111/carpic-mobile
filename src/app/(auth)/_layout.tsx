import { Redirect, Stack, type Href } from 'expo-router';

import { useIntro } from '@/features/onboarding/introStore';
import { useAuth } from '@/providers/AuthProvider';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const introSeen = useIntro((s) => s.seen);

  // If already signed in, skip the auth screens.
  if (!loading && session) return <Redirect href="/" />;
  // First-time users see the intro before sign-in (flag hydrated at root).
  if (introSeen === false) return <Redirect href={'/onboarding' as Href} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
