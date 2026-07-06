import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { asyncStoragePersister, queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 }}
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
