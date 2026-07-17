import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';

/**
 * Recoverable dead-end for an id-based screen whose target is missing, deleted,
 * or failed to load — shown instead of an infinite spinner. Optional retry when
 * the cause is a transient load error rather than a genuinely absent item.
 */
export function NotFound({
  title = 'Not found',
  subtitle = "This item doesn't exist anymore.",
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  return (
    <SafeAreaView style={styles.wrap}>
      <Text variant="heading" center>
        {title}
      </Text>
      <Text variant="body" muted center>
        {subtitle}
      </Text>
      {onRetry ? <Button title="Try again" icon="refresh" onPress={onRetry} /> : null}
      <Button
        title="Go back"
        variant={onRetry ? 'ghost' : 'primary'}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </SafeAreaView>
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
