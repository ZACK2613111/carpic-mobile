import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { getProject } from '@/features/projects/projects.api';
import type { Project } from '@/features/projects/types';
import { projectKeys, useDeleteProject, useProjects, useSignedUrl } from '@/features/projects/useProjects';
import { haptics } from '@/lib/haptics';
import { colors, glow, gradients, radius, shadow, spacing } from '@/theme';

export default function ProjectsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: projects, isLoading, isError, error, refetch, isRefetching } = useProjects();
  const del = useDeleteProject();

  const prefetch = useCallback(
    (id: string) => {
      qc.prefetchQuery({ queryKey: projectKeys.detail(id), queryFn: () => getProject(id) });
    },
    [qc]
  );

  const confirmDelete = useCallback(
    (project: Project) => {
      haptics.warning();
      Alert.alert('Delete project', `Delete "${project.name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            del.mutate(project.id, {
              onError: () => Alert.alert('Delete failed', 'Could not delete the project — please try again.'),
            }),
        },
      ]);
    },
    [del]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text variant="display">Projects</Text>
          <Text variant="body" muted>
            {projects?.length ? `${projects.length} in your studio` : 'Your car photo studio'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <View style={styles.center}>
          <EmptyState
            icon="refresh"
            title="Couldn't load projects"
            subtitle={error instanceof Error ? error.message : 'Pull to retry.'}
          />
        </View>
      ) : (
        <FlatList
          data={projects ?? []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <EmptyState
                icon="car"
                title="No projects yet"
                subtitle="Turn a car photo into a studio-quality shot in seconds."
                actionLabel="New project"
                onAction={() => router.push('/new')}
              />
            </View>
          }
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPressIn={() => prefetch(item.id)}
              onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}

      <PressableScale style={styles.fabWrap} onPress={() => router.push('/new')} haptic="medium">
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fab, glow(colors.primary, 0.5)]}
        >
          <Icon name="plus" size={28} color="#FFFFFF" />
        </LinearGradient>
      </PressableScale>
    </SafeAreaView>
  );
}

function ProjectCard({
  project,
  onPress,
  onPressIn,
  onLongPress,
}: {
  project: Project;
  onPress: () => void;
  onPressIn: () => void;
  onLongPress: () => void;
}) {
  const { data: thumbUrl } = useSignedUrl(project.thumb_path);

  return (
    <PressableScale style={styles.card} onPress={onPress} onPressIn={onPressIn} onLongPress={onLongPress}>
      <View style={styles.thumb}>
        {thumbUrl ? (
          <Image
            source={{ uri: thumbUrl }}
            style={styles.thumbImg}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
            recyclingKey={project.id}
          />
        ) : (
          <Icon name="car" size={40} color={colors.textFaint} />
        )}
      </View>
      <Text variant="bodyStrong" numberOfLines={1}>
        {project.name}
      </Text>
      <Text variant="caption" faint>
        Tap to open
      </Text>
    </PressableScale>
  );
}

function SkeletonGrid() {
  return (
    <View style={[styles.list, styles.skeletonWrap]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton aspectRatio={1} borderRadius={radius.lg} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
      ))}
    </View>
  );
}

const CARD_GAP = spacing.md;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl },
  list: { padding: spacing.lg, gap: CARD_GAP, flexGrow: 1 },
  row: { gap: CARD_GAP },
  skeletonWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  skeletonThumb: { width: '100%', aspectRatio: 1 },
  card: { flex: 1, gap: spacing.xs, marginBottom: CARD_GAP, maxWidth: '48.5%' },
  thumb: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.sm,
  },
  thumbImg: { width: '100%', height: '100%' },
  chip: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  fabWrap: { position: 'absolute', right: spacing.lg, bottom: spacing.xl },
  fab: { width: 62, height: 62, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
});
