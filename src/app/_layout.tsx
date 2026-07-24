import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { loadBrand } from '@/features/branding/brand';
import { loadCapturePrefs } from '@/features/capture/capturePrefs';
import { useIntro } from '@/features/onboarding/introStore';
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
  const introSeen = useIntro((s) => s.seen); // null until hydrated from storage

  // Skia's web build needs CanvasKit (WASM) loaded before any Skia surface,
  // matchFont() or <Canvas> renders. Native ships CanvasKit in the binary, so we
  // gate only on web. The import is dynamic + platform-guarded so the web-only
  // module never enters the native bundle; the WASM is fetched from a CDN because
  // Metro doesn't serve it as a static asset in dev.
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let alive = true;
    import('@shopify/react-native-skia/lib/commonjs/web')
      .then((m) =>
        m.LoadSkiaWeb({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.41.0/bin/full/${file}`,
        }),
      )
      .then(() => {
        if (alive) setSkiaReady(true);
      })
      .catch((e) => {
        // Don't hard-block: let the app render so non-Skia screens work and any
        // Skia screen falls back to its error boundary instead of a blank gate.
        console.warn('Skia web init failed', e);
        if (alive) setSkiaReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Restore the persisted upload outbox and start draining (offline-first).
  useEffect(() => {
    void initI18n();
    void useIntro.getState().hydrate();
    initUploads();
    void loadBrand();
    void loadCapturePrefs();
  }, []);

  // Hold the first frame until the typeface is ready so text doesn't reflow from a
  // system-font flash into Montserrat, until CanvasKit loads on web, and until the
  // first-run flag is known (so we don't flash sign-in before onboarding).
  if (!fontsLoaded || !skiaReady || introSeen === null) return null;

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
                <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                <Stack.Screen name="new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="capture/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="capture/spin/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="spin/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="editor/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="preview/[id]" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </AuthProvider>
          </ToastProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
