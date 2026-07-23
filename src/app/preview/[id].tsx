import { useCanvasRef } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { NotFound } from '@/components/NotFound';
import { Text } from '@/components/Text';
import { useBrand, watermarkVisible, type WatermarkPosition } from '@/features/branding/brand';
import { getSlot, localizedLabel } from '@/features/capture/shotTemplate';
import { StudioCanvas } from '@/features/editor/StudioCanvas';
import type { SpinData } from '@/features/projects/types';
import { useProject } from '@/features/projects/useProjects';
import type { Shot } from '@/features/shots/types';
import { useShots, useShotSignedUrl } from '@/features/shots/useShots';
import { SpinViewer } from '@/features/spin/SpinViewer';
import { useSpinFrames } from '@/features/spin/useSpin';
import { useLocale, useT, type Locale } from '@/lib/i18n';
import { useRouteId } from '@/lib/useRouteId';
import { colors, radius, spacing } from '@/theme';

type Page = { key: string; kind: 'spin'; spin: SpinData } | { key: string; kind: 'shot'; shot: Shot };

/**
 * In-app buyer-style preview: swipe UP/DOWN through the finished listing — the
 * 360 and each composed shot (cutout on its background, silhouette shadow, pins,
 * plate, watermark) exactly as they publish. Vertical paging so the 360's
 * horizontal drag-to-rotate never fights the pager, and only the visible page is
 * decoded (editor-grade memory discipline).
 */
export default function PreviewScreen() {
  const id = useRouteId() ?? '';
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { width } = useWindowDimensions();
  const { data: project, isError, refetch } = useProject(id || undefined);
  const { data: shots } = useShots(id || undefined);
  const [containerH, setContainerH] = useState(0);
  const [index, setIndex] = useState(0);

  const brand = useBrand();
  const watermark = watermarkVisible(brand) ? { text: brand.text, position: brand.position } : undefined;

  const spin = project?.spin ?? null;
  const pages = useMemo<Page[]>(() => {
    const list: Page[] = [];
    if (spin && spin.frameCount > 0) list.push({ key: 'spin', kind: 'spin', spin });
    (shots ?? [])
      .filter((s) => s.captured && s.image_path)
      .sort((a, b) => a.position - b.position)
      .forEach((s) => list.push({ key: s.id, kind: 'shot', shot: s }));
    return list;
  }, [spin, shots]);

  if (!id || isError) {
    return (
      <NotFound
        title={t('preview.title')}
        subtitle={isError ? t('project.loadFailed') : t('project.gone')}
        onRetry={isError ? () => void refetch() : undefined}
      />
    );
  }

  const stageW = width;
  const stageH = Math.round(width * 0.75);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        <Text variant="heading" numberOfLines={1} style={styles.title}>
          {project?.name || t('preview.title')}
        </Text>
        <Text variant="caption" muted style={styles.counter}>
          {pages.length ? `${index + 1} / ${pages.length}` : ''}
        </Text>
      </View>

      {pages.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="image"
            title={t('preview.empty')}
            subtitle={t('project.captureFirst')}
            actionLabel={t('project.capture')}
            onAction={() => router.replace({ pathname: '/capture/[id]', params: { id } })}
          />
        </View>
      ) : (
        <View style={styles.pager} onLayout={(e) => setContainerH(Math.round(e.nativeEvent.layout.height))}>
          {containerH > 0 ? (
            <FlatList
              data={pages}
              keyExtractor={(p) => p.key}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, i) => ({ length: containerH, offset: containerH * i, index: i })}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={3}
              removeClippedSubviews={Platform.OS === 'android'}
              onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.y / containerH))}
              renderItem={({ item }) => (
                <View style={[styles.page, { height: containerH, width }]}>
                  {item.kind === 'spin' ? (
                    <SpinPreview spin={item.spin} projectId={id} width={stageW} height={stageH} label={t('project.spin360')} />
                  ) : (
                    <ShotPreview shot={item.shot} width={stageW} height={stageH} locale={locale} watermark={watermark} />
                  )}
                </View>
              )}
            />
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

function Stage({ height, children, label }: { height: number; children: React.ReactNode; label: string }) {
  return (
    <>
      <View style={[styles.stage, { height }]}>{children}</View>
      <Text variant="bodyStrong" center style={styles.caption} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
}

function ShotPreview({
  shot,
  width,
  height,
  locale,
  watermark,
}: {
  shot: Shot;
  width: number;
  height: number;
  locale: Locale;
  watermark?: { text: string; position: WatermarkPosition };
}) {
  const canvasRef = useCanvasRef(); // required by StudioCanvas (export ref); unused here
  const { data: originalUri } = useShotSignedUrl(shot.image_path);
  const { data: cutoutUri } = useShotSignedUrl(shot.cutout_path ?? null);
  const slot = getSlot(shot.slot);
  const ready = Boolean(originalUri || cutoutUri);

  return (
    <Stage height={height} label={slot ? localizedLabel(slot, locale) : shot.slot}>
      {ready ? (
        <StudioCanvas
          width={width}
          height={height}
          canvasRef={canvasRef}
          originalUri={originalUri ?? null}
          cutoutUri={cutoutUri ?? null}
          backgroundId={shot.background_id}
          hotspots={shot.doc?.hotspots ?? []}
          selectedId={null}
          shadow={shot.doc?.shadow}
          plate={shot.doc?.plate}
          plateSelected={false}
          watermark={watermark}
        />
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </Stage>
  );
}

function SpinPreview({
  spin,
  projectId,
  width,
  height,
  label,
}: {
  spin: SpinData;
  projectId: string;
  width: number;
  height: number;
  label: string;
}) {
  const { data: frameUrls } = useSpinFrames(projectId, spin.frameCount, Boolean(spin.hasCutout));
  const ready = Boolean(frameUrls && frameUrls.length);

  return (
    <View style={{ width }}>
      <Stage height={height} label={label}>
        {ready ? (
          <SpinViewer
            frameUrls={frameUrls ?? []}
            cutout={spin.hasCutout}
            backgroundId={spin.backgroundId}
            shadow={spin.shadow}
            hotspots={spin.hotspots ?? []}
          />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </Stage>
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
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  title: { flex: 1, textAlign: 'center' },
  counter: { minWidth: 44, textAlign: 'right', paddingRight: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pager: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center' },
  stage: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { marginTop: spacing.md, paddingHorizontal: spacing.lg },
});
