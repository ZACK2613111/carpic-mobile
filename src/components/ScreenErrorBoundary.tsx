import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';

// Route-level crash screen, wired via `export { ErrorBoundary }` in _layout:
// a render error in one screen degrades to this instead of killing the whole
// session (and the user's unsaved work with it).
export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="heading" center>
        Something went wrong
      </Text>
      <Text variant="body" muted center>
        {error.message}
      </Text>
      <Button title="Try again" icon="refresh" onPress={() => void retry()} />
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
