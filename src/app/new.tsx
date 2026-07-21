import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useCreateProject } from '@/features/projects/useProjects';
import { useT } from '@/lib/i18n';
import { colors, spacing } from '@/theme';

export default function NewProjectScreen() {
  const router = useRouter();
  const createProject = useCreateProject();
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const project = await createProject.mutateAsync(name.trim() || defaultName());
      router.replace({ pathname: '/project/[id]', params: { id: project.id } });
    } catch (e) {
      Alert.alert(t('new.couldNotCreate'), e instanceof Error ? e.message : t('common.tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="close" variant="ghost" accessibilityLabel={t('common.cancel')} onPress={() => router.back()} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={styles.inner}>
          <Text variant="title" center>
            {t('new.title')}
          </Text>
          <Text variant="body" muted center>
            {t('new.sub')}
          </Text>
          <TextField
            label={t('new.car')}
            value={name}
            onChangeText={setName}
            placeholder="e.g. BMW 320d 2019"
            autoFocus
          />
          <Button title={t('new.createCapture')} icon="camera" size="lg" onPress={create} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function defaultName(): string {
  const d = new Date();
  return `Car ${d.toLocaleDateString()}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignItems: 'flex-start' },
  body: { flex: 1, justifyContent: 'center' },
  inner: { padding: spacing.xl, gap: spacing.md },
});
