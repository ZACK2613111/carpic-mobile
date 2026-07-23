import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useT } from '@/lib/i18n';
import { colors, spacing } from '@/theme';

/**
 * Recoverable dead-end for an id-based screen whose target is missing, deleted,
 * or failed to load — shown instead of an infinite spinner. Optional retry when
 * the cause is a transient load error rather than a genuinely absent item.
 */
export function NotFound({
  title,
  subtitle,
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <SafeAreaView style={styles.wrap}>
      <Text variant="heading" center>
        {title ?? t('notFound.itemTitle')}
      </Text>
      <Text variant="body" muted center>
        {subtitle ?? t('notFound.itemBody')}
      </Text>
      {onRetry ? <Button title={t('common.retry')} icon="refresh" onPress={onRetry} /> : null}
      <Button
        title={t('common.back')}
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
