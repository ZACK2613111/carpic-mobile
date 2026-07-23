import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { loadBrand } from '@/features/branding/brand';
import { loadCapturePrefs } from '@/features/capture/capturePrefs';
import { initUploads } from '@/features/uploads/uploads';
import { fontAssets } from '@/lib/fonts';
import { initI18n } from '@/lib/i18n';
import { asyncStoragePersister, dehydrateOptions, queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/providers/AuthProvider';
import { colors } from '@/theme';

// Route-level error boundary: a crash in any screen renders a recoverable
// fallback instead of taking down the app.
export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ScreenErrorBoundary';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);

  // Restore the persisted upload outbox and start draining (offline-first).
  useEffect(() => {
    void initI18n();
    initUploads();
    void loadBrand();
    void loadCapturePrefs();
  }, []);

  // Hold the first frame until the typeface is ready so text doesn't reflow
  // from a system-font flash into Sora.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24, dehydrateOptions }}
        >
          <ToastProvider>
            <AuthProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="capture/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="capture/spin/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="spin/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="editor/[id]" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </AuthProvider>
          </ToastProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
