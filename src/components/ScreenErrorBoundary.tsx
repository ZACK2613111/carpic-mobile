import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { captureException } from '@/lib/reporting';
import { colors, spacing } from '@/theme';

// Route-level crash screen, wired via `export { ErrorBoundary }` in _layout:
// a render error in one screen degrades to this instead of killing the whole
// session (and the user's unsaved work with it).
export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useT();
  // Report the crash once (the single most important thing to send to Sentry).
  useEffect(() => {
    captureException(error, { boundary: 'screen' });
  }, [error]);
  return (
    <View style={styles.wrap}>
      <Text variant="heading" center>
        {t('common.somethingWrong')}
      </Text>
      <Text variant="body" muted center>
        {error.message}
      </Text>
      <Button title={t('common.retry')} icon="refresh" onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
});
