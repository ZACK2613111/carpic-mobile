import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { initUploads } from '@/features/uploads/uploads';
import { asyncStoragePersister, dehydrateOptions, queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/providers/AuthProvider';
import { colors } from '@/theme';

// Route-level error boundary: a crash in any screen renders a recoverable
// fallback instead of taking down the app.
export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ScreenErrorBoundary';

export default function RootLayout() {
  // Restore the persisted upload outbox and start draining (offline-first).
  useEffect(() => {
    initUploads();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24, dehydrateOptions }}
        >
          <ToastProvider>
            <AuthProvider>
              <StatusBar style="light" />
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
