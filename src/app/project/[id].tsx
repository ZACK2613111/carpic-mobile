import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { GROUP_LABELS, GROUP_ORDER, SHOT_TEMPLATE, type ShotSlot } from '@/features/capture/shotTemplate';
import { publishProject } from '@/features/publish/publish';
import type { Shot } from '@/features/shots/types';
import { useShots, useShotSignedUrl } from '@/features/shots/useShots';
import { useProject } from '@/features/projects/useProjects';
import { colors, radius, spacing } from '@/theme';

export default function ProjectDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: project } = useProject(id);
  const { data: shots, isLoading } = useShots(id);

  const bySlot = useMemo(() => {
    const map: Record<string, Shot> = {};
    (shots ?? []).forEach((s) => {
      map[s.slot] = s;
    });
    return map;
  }, [shots]);

  const capturedCount = (shots ?? []).filter((s) => s.captured).length;
  const total = SHOT_TEMPLATE.length;
  const pct = Math.round((capturedCount / total) * 100);

  const [publishing, setPublishing] = useState<string | null>(null);
  const doPublish = useCallback(async () => {
    if (!project) return;
    if (capturedCount === 0) {
      toast.show('Capture some shots first', 'info');
      return;
    }
    setPublishing('Preparing');
    try {
      const link = await publishProject(project, shots ?? [], (label) => setPublishing(label));
      setPublishing(null);
      await Share.share({ message: link, url: link });
      toast.show('Published — link ready to share', 'success');
    } catch (e) {
      setPublishing(null);
      toast.show(e instanceof Error ? e.message : 'Publish failed', 'error');
    }
  }, [project, shots, capturedCount, toast]);

  const openSlot = (slot: ShotSlot) => {
    const shot = bySlot[slot.id];
    if (shot?.captured) {
      router.push({ pathname: '/editor/[id]', params: { id: shot.id } });
    } else {
      router.push({ pathname: '/capture/[id]', params: { id, start: slot.id } });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="heading" numberOfLines={1} style={styles.title}>
          {project?.name ?? 'Project'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text variant="bodyStrong">
                {capturedCount} / {total} shots
              </Text>
              <Text variant="caption" muted>
                {pct}%
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
          </View>

          {/* primary actions */}
          <Button
            title="Guided capture"
            icon="camera"
            size="lg"
            onPress={() => router.push({ pathname: '/capture/[id]', params: { id } })}
          />
          <View style={styles.actionRow}>
            <ActionTile
              icon="refresh"
              label="360° spin"
              hint={project?.spin?.frameCount ? `${project.spin.frameCount} frames` : 'Capture'}
              onPress={() => router.push({ pathname: '/spin/[id]', params: { id } })}
            />
            <ActionTile
              icon="share"
              label="Publish link"
              hint={project?.status === 'published' ? 'Re-publish' : 'Share'}
              onPress={doPublish}
            />
          </View>

          {/* shot groups */}
          {GROUP_ORDER.map((group) => {
            const slots = SHOT_TEMPLATE.filter((s) => s.group === group);
            return (
              <View key={group} style={styles.group}>
                <Text variant="label" muted>
                  {GROUP_LABELS[group].label.toUpperCase()} · {GROUP_LABELS[group].labelFr}
                </Text>
                <View style={styles.grid}>
                  {slots.map((slot) => (
                    <ShotTile key={slot.id} slot={slot} shot={bySlot[slot.id]} onPress={() => openSlot(slot)} />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {publishing ? (
        <View style={styles.publishOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text variant="bodyStrong">{publishing}…</Text>
          <Text variant="caption" muted>
            Building your shareable link
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ActionTile({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: 'refresh' | 'share';
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.actionTile} onPress={onPress}>
      <Icon name={icon} size={22} color={colors.primary} />
      <Text variant="bodyStrong">{label}</Text>
      {hint ? (
        <Text variant="caption" faint>
          {hint}
        </Text>
      ) : null}
    </PressableScale>
  );
}

function ShotTile({ slot, shot, onPress }: { slot: ShotSlot; shot?: Shot; onPress: () => void }) {
  const { data: url } = useShotSignedUrl(shot?.captured ? (shot.cutout_path ?? shot.image_path) : null);
  return (
    <PressableScale style={styles.tile} onPress={onPress} haptic="selection">
      <View style={styles.tileThumb}>
        {url ? (
          <Image source={{ uri: url }} style={styles.tileImg} contentFit="cover" cachePolicy="memory-disk" transition={120} />
        ) : (
          <Icon name={slot.group === 'engine' ? 'car' : 'camera'} size={20} color={colors.textFaint} />
        )}
        {shot?.captured ? (
          <View style={styles.badge}>
            <Icon name="check" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Text variant="caption" numberOfLines={1} muted={!shot?.captured} center>
        {slot.label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  title: { flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  group: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '31%', gap: 4 },
  tileThumb: {
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileImg: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
