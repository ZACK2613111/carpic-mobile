import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { getProject } from '@/features/projects/projects.api';
import { filterAndSortProjects, isPublished, type SortMode } from '@/features/projects/projectListView';
import type { Project } from '@/features/projects/types';
import { projectKeys, useDeleteProject, useProjects, useSignedUrl } from '@/features/projects/useProjects';
import { haptics } from '@/lib/haptics';
import { relativeTime } from '@/lib/relativeTime';
import { colors, radius, shadow, spacing } from '@/theme';

export default function ProjectsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: projects, isLoading, isError, error, refetch, isRefetching } = useProjects();
  const del = useDeleteProject();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const visible = useMemo(() => filterAndSortProjects(projects ?? [], { query, sort }), [projects, query, sort]);
  // Only surface the search/sort controls once the grid is big enough to need them.
  const showControls = (projects?.length ?? 0) >= 5;

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
          data={visible}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            showControls ? (
              <View style={styles.controls}>
                <View style={styles.searchWrap}>
                  <TextField
                    leftIcon="crosshair"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search name, VIN or make…"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                </View>
                <PressableScale
                  style={styles.sortBtn}
                  onPress={() => setSort((s) => (s === 'recent' ? 'name' : 'recent'))}
                  haptic="selection"
                >
                  <Icon name="sliders" size={16} color={colors.textMuted} />
                  <Text variant="label" muted>
                    {sort === 'recent' ? 'Recent' : 'Name'}
                  </Text>
                </PressableScale>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              {query ? (
                <EmptyState icon="crosshair" title="No matches" subtitle={`Nothing matches “${query}”.`} />
              ) : (
                <EmptyState
                  icon="image"
                  title="No projects yet"
                  subtitle="Turn a car photo into a studio-quality shot in seconds."
                  actionLabel="New project"
                  onAction={() => router.push('/new')}
                />
              )}
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

      <PressableScale
        style={[styles.fab, shadow.md]}
        onPress={() => router.push('/new')}
        haptic="medium"
        accessibilityRole="button"
        accessibilityLabel="New project"
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
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
  const updated = relativeTime(project.updated_at);

  return (
    <PressableScale
      style={styles.card}
      onPress={onPress}
      onPressIn={onPressIn}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${project.name}${isPublished(project) ? ', published' : ''}`}
      accessibilityHint="Long press to delete"
    >
      <View style={styles.thumb}>
        {thumbUrl ? (
          <>
            <Image
              source={{ uri: thumbUrl }}
              style={styles.thumbImg}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
              recyclingKey={project.id}
            />
            {/* Top scrim keeps the published chip legible over any photo. */}
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.thumbScrim}
              pointerEvents="none"
            />
          </>
        ) : (
          <Text variant="title" faint>
            {initials(project.name)}
          </Text>
        )}
        {isPublished(project) ? (
          <View style={styles.chip}>
            <Chip label="Published" color={colors.success} />
          </View>
        ) : null}
      </View>
      <Text variant="bodyStrong" numberOfLines={1}>
        {project.name}
      </Text>
      {updated ? (
        <Text variant="caption" faint>
          {updated}
        </Text>
      ) : null}
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
  thumbScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: '38%' },
  chip: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  searchWrap: { flex: 1 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Neutral typographic placeholder for projects without a thumbnail — up to two
// initials, uppercased. Reads as a real product, not a clip-art car.
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
