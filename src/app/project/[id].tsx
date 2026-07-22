import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { NotFound } from '@/components/NotFound';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { captureLinkUrl, getOrCreateCaptureLink } from '@/features/capture-links/captureLinks.api';
import { getSlot, GROUP_LABELS, GROUP_ORDER, localizedLabel, SHOT_TEMPLATE, type ShotSlot } from '@/features/capture/shotTemplate';
import { summarizeInspection, type HotspotGroup } from '@/features/inspection/report';
import { publishProject } from '@/features/publish/publish';
import type { Shot } from '@/features/shots/types';
import { shotKeys, useShots, useShotSignedUrl } from '@/features/shots/useShots';
import { usePendingUploads } from '@/features/uploads/usePendingUploads';
import type { ShotUploadPayload } from '@/features/uploads/uploads';
import { useProject, useUpdateProject } from '@/features/projects/useProjects';
import { decodeVin, normalizeVin, vinSummary } from '@/features/vehicle/vin';
import { useLocale, useT } from '@/lib/i18n';
import { uploadFileUri, type UploadTask } from '@/lib/uploadQueue';
import { useRouteId } from '@/lib/useRouteId';
import { colors, radius, severityColor, shadow, spacing } from '@/theme';

export default function ProjectDashboard() {
  const id = useRouteId();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const locale = useLocale();
  const { data: project, isError: projectError, refetch: refetchProject } = useProject(id ?? undefined);
  const { data: shots, isLoading } = useShots(id ?? undefined);
  const qc = useQueryClient();

  // Photos can arrive from OUTSIDE the app (remote capture link) — refetch the
  // shot list whenever this screen regains focus so they show up without a
  // manual reload.
  useFocusEffect(
    useCallback(() => {
      if (id) qc.invalidateQueries({ queryKey: shotKeys.list(id) });
    }, [id, qc])
  );

  const bySlot = useMemo(() => {
    const map: Record<string, Shot> = {};
    (shots ?? []).forEach((s) => {
      map[s.slot] = s;
    });
    return map;
  }, [shots]);

  // Photos captured but not yet synced (offline / upload in flight) — shown on
  // their tile from the local outbox file until the real row lands.
  const pendingUploads = usePendingUploads(id ?? undefined);
  const pendingBySlot = useMemo(() => {
    const map: Record<string, UploadTask> = {};
    pendingUploads.forEach((tk) => {
      if (tk.kind === 'shot') map[(tk.payload as ShotUploadPayload).slot] = tk;
    });
    return map;
  }, [pendingUploads]);

  // Condition report: aggregate inspection pins across every shot + the 360.
  const inspection = useMemo(() => {
    const groups: HotspotGroup[] = (shots ?? []).map((s) => ({
      area: getSlot(s.slot)?.label ?? s.slot,
      hotspots: s.doc?.hotspots ?? [],
    }));
    if (project?.spin?.hotspots?.length) {
      groups.push({ area: '360°', hotspots: project.spin.hotspots });
    }
    return summarizeInspection(groups);
  }, [shots, project]);

  const capturedCount = (shots ?? []).filter((s) => s.captured).length;
  const total = SHOT_TEMPLATE.length;
  const pct = Math.round((capturedCount / total) * 100);

  const [publishing, setPublishing] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  // "Request photos": share a tokenized browser link so the vehicle owner can
  // shoot the guided list themselves — no app install on their side.
  const doRequestPhotos = useCallback(async () => {
    if (requesting || !id) return;
    setRequesting(true);
    try {
      const link = await getOrCreateCaptureLink(id);
      const url = captureLinkUrl(link);
      await Share.share({ message: url, url });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : t('project.linkFailed'), 'error');
    } finally {
      setRequesting(false);
    }
  }, [id, requesting, toast, t]);
  const doPublish = useCallback(async () => {
    if (!project) return;
    if (capturedCount === 0) {
      toast.show(t('project.captureFirst'), 'info');
      return;
    }
    setPublishing(t('publish.preparing'));
    try {
      const link = await publishProject(project, shots ?? [], (label) => setPublishing(label));
      setPublishing(null);
      await Share.share({ message: link, url: link });
      toast.show(t('project.publishedToast'), 'success');
    } catch (e) {
      setPublishing(null);
      toast.show(e instanceof Error ? e.message : t('project.publishFailed'), 'error');
    }
  }, [project, shots, capturedCount, toast, t]);

  const openSlot = (slot: ShotSlot) => {
    const shot = bySlot[slot.id];
    if (shot?.captured) {
      router.push({ pathname: '/editor/[id]', params: { id: shot.id } });
    } else if (pendingBySlot[slot.id]) {
      // Captured but not synced yet — the editor needs the DB row to exist.
      toast.show(t('project.syncing'), 'info');
    } else {
      router.push({ pathname: '/capture/[id]', params: { id, start: slot.id } });
    }
  };

  if (!id || projectError) {
    return (
      <NotFound
        title={t('project.unavailableTitle')}
        subtitle={projectError ? t('project.loadFailed') : t('project.gone')}
        onRetry={projectError ? () => void refetchProject() : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        <Text variant="heading" numberOfLines={1} style={styles.title}>
          {project?.name ?? t('project.fallbackName')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text variant="bodyStrong">{t('project.shotsCount', { done: capturedCount, total })}</Text>
              <Text variant="caption" muted>
                {pct}%
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
            {pendingUploads.length > 0 ? (
              <View style={styles.pendingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text variant="caption" muted>
                  {t('project.pending', { n: pendingUploads.length })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* vehicle (VIN) */}
          <VinCard projectId={id} initialVin={project?.vin ?? ''} />

          {/* condition report (only once there are inspection points) */}
          {inspection.inspectionCount > 0 ? (
            <View style={styles.vinCard}>
              <View style={styles.vinHeader}>
                <Text variant="bodyStrong">{t('project.condition')}</Text>
                <Text variant="caption" muted style={styles.conditionCount}>
                  {t('project.conditionPoints', { n: inspection.inspectionCount })}
                </Text>
              </View>
              <View style={styles.vinChips}>
                {(['high', 'medium', 'low'] as const).map((sev) =>
                  inspection.bySeverity[sev] > 0 ? (
                    <View key={sev} style={styles.sevChip}>
                      <View style={[styles.sevDot, { backgroundColor: severityColor(sev) }]} />
                      <Text variant="caption">
                        {inspection.bySeverity[sev]}{' '}
                        {t(sev === 'high' ? 'project.sevHigh' : sev === 'medium' ? 'project.sevMedium' : 'project.sevLow')}
                      </Text>
                    </View>
                  ) : null
                )}
              </View>
              {inspection.marketingCount > 0 ? (
                <Text variant="caption" faint>
                  {t('project.highlights', { n: inspection.marketingCount })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* primary actions */}
          <Button
            title={t('project.guidedCapture')}
            icon="camera"
            size="lg"
            onPress={() => router.push({ pathname: '/capture/[id]', params: { id } })}
          />
          <View style={styles.actionRow}>
            <ActionTile
              icon="refresh"
              label={t('project.spin360')}
              hint={project?.spin?.frameCount ? t('project.frames', { n: project.spin.frameCount }) : t('project.capture')}
              onPress={() => router.push({ pathname: '/spin/[id]', params: { id } })}
            />
            <ActionTile
              icon="share"
              label={t('project.publishLink')}
              hint={project?.status === 'published' ? t('project.rePublish') : t('project.share')}
              onPress={doPublish}
            />
          </View>
          <View style={styles.actionRow}>
            <ActionTile
              icon="camera"
              label={t('project.requestPhotos')}
              hint={requesting ? t('project.preparing') : t('project.ownerShoots')}
              onPress={doRequestPhotos}
            />
          </View>

          {/* shot groups */}
          {GROUP_ORDER.map((group) => {
            const slots = SHOT_TEMPLATE.filter((s) => s.group === group);
            return (
              <View key={group} style={styles.group}>
                <Text variant="label" muted>
                  {localizedLabel(GROUP_LABELS[group], locale).toUpperCase()}
                </Text>
                <View style={styles.grid}>
                  {slots.map((slot) => (
                    <ShotTile
                      key={slot.id}
                      slot={slot}
                      shot={bySlot[slot.id]}
                      pendingUri={pendingBySlot[slot.id] ? uploadFileUri(pendingBySlot[slot.id]) : null}
                      onPress={() => openSlot(slot)}
                    />
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
            {t('project.buildingLink')}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function VinCard({ projectId, initialVin }: { projectId: string; initialVin: string }) {
  const updateProject = useUpdateProject();
  const t = useT();
  const [text, setText] = useState(initialVin);
  // Re-seed if the project loads/refetches with a different stored VIN.
  const seeded = useRef(initialVin);
  if (seeded.current !== initialVin && text === seeded.current) {
    seeded.current = initialVin;
    setText(initialVin);
  }

  const info = useMemo(() => (text.trim() ? decodeVin(text) : null), [text]);
  const summary = info?.valid ? vinSummary(info) : '';

  const commit = useCallback(() => {
    const normalized = normalizeVin(text);
    if ((normalized || null) === (initialVin || null)) return;
    updateProject.mutate({ id: projectId, patch: { vin: normalized || null } });
  }, [text, initialVin, projectId, updateProject]);

  return (
    <View style={styles.vinCard}>
      <View style={styles.vinHeader}>
        <Text variant="bodyStrong">{t('project.vehicle')}</Text>
      </View>
      <TextField
        value={text}
        onChangeText={setText}
        onBlur={commit}
        placeholder={t('project.vinPlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={20}
      />
      {info && !info.valid && text.trim().length > 0 ? (
        <Text variant="caption" faint>
          {t('project.vinHint')}
        </Text>
      ) : summary ? (
        <View style={styles.vinChips}>
          {info?.year ? <Chip label={String(info.year)} filled={false} /> : null}
          {info?.make ? <Chip label={info.make} filled={false} /> : null}
          {info?.region ? <Chip label={info.region} filled={false} color={colors.textMuted} /> : null}
        </View>
      ) : (
        <Text variant="caption" faint>
          {t('project.vinAuto')}
        </Text>
      )}
    </View>
  );
}

function ActionTile({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: 'refresh' | 'share' | 'camera';
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

function ShotTile({
  slot,
  shot,
  pendingUri,
  onPress,
}: {
  slot: ShotSlot;
  shot?: Shot;
  pendingUri?: string | null;
  onPress: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { data: url } = useShotSignedUrl(shot?.captured ? (shot.cutout_path ?? shot.image_path) : null);
  // A queued (not-yet-synced) capture shows its local outbox file so offline
  // work is visible immediately, with an "uploading" badge instead of the check.
  const displayUri = url ?? (!shot?.captured ? pendingUri : null);
  const isPending = !shot?.captured && Boolean(pendingUri);
  const label = localizedLabel(slot, locale);
  const state = shot?.captured ? t('project.captured') : isPending ? t('project.uploading') : t('project.notCaptured');
  return (
    <PressableScale
      style={styles.tile}
      onPress={onPress}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${state}`}
    >
      <View style={styles.tileThumb}>
        {displayUri ? (
          <Image
            source={{ uri: displayUri }}
            style={styles.tileImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
            recyclingKey={shot?.id ?? slot.id}
          />
        ) : (
          <Icon name="plus" size={18} color={colors.textFaint} />
        )}
        {shot?.captured ? (
          <View style={styles.badge}>
            <Icon name="check" size={12} color="#FFFFFF" />
          </View>
        ) : isPending ? (
          <View style={[styles.badge, styles.badgePending]}>
            <Icon name="up" size={12} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Text variant="caption" numberOfLines={1} muted={!shot?.captured && !isPending} center>
        {label}
      </Text>
    </PressableScale>
  );
}

// Layout-faithful placeholder while the dashboard loads — steadier than a lone
// spinner and it makes the wait feel shorter on slow connections.
function DashboardSkeleton() {
  return (
    <View style={styles.content}>
      <Skeleton height={74} borderRadius={radius.lg} />
      <Skeleton height={104} borderRadius={radius.lg} />
      <Skeleton height={56} borderRadius={radius.md} />
      <View style={styles.actionRow}>
        <Skeleton height={92} borderRadius={radius.lg} style={styles.skFlex} />
        <Skeleton height={92} borderRadius={radius.lg} style={styles.skFlex} />
      </View>
      <Skeleton width="42%" height={12} />
      <View style={styles.grid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} aspectRatio={1} borderRadius={radius.md} style={styles.skTile} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  title: { flex: 1, textAlign: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.sm,
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
    ...shadow.sm,
  },
  group: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skFlex: { flex: 1 },
  skTile: { width: '31%' },
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
    end: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePending: { backgroundColor: colors.primary },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vinCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.sm,
  },
  vinHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vinChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  conditionCount: { marginStart: 'auto' },
  sevChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  sevDot: { width: 8, height: 8, borderRadius: 4 },
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
