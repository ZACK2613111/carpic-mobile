import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';

// Catch-all for bad deep links (carstudio://…) and stale routes.
export default function NotFoundScreen() {
  return (
    <View style={styles.wrap}>
      <Text variant="heading" center>
        Page not found
      </Text>
      <Text variant="body" muted center>
        This link doesn&apos;t match anything in CarStudio.
      </Text>
      <Button title="Go home" icon="car" onPress={() => router.replace('/')} />
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
