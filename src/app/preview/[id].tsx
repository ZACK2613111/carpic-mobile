import { useCanvasRef } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { NotFound } from '@/components/NotFound';
import { Text } from '@/components/Text';
import { useBrand, watermarkVisible } from '@/features/branding/brand';
import { getSlot, localizedLabel } from '@/features/capture/shotTemplate';
import { StudioCanvas } from '@/features/editor/StudioCanvas';
import type { Shot } from '@/features/shots/types';
import { useShots, useShotSignedUrl } from '@/features/shots/useShots';
import { useProject } from '@/features/projects/useProjects';
import { useLocale, useT } from '@/lib/i18n';
import { useRouteId } from '@/lib/useRouteId';
import { colors, radius, spacing } from '@/theme';

/**
 * In-app buyer-style preview of a project's listing: each captured shot composed
 * exactly as it will publish (cutout on its background, ground shadow, pins,
 * plate, watermark) — so the seller can judge the render on their phone without
 * publishing. A horizontal pager keeps only the visible shot(s) decoded (the
 * same memory discipline as the editor).
 */
export default function PreviewScreen() {
  const id = useRouteId() ?? '';
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const { data: project, isError, refetch } = useProject(id || undefined);
  const { data: shots } = useShots(id || undefined);
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const brand = useBrand();
  const watermark = watermarkVisible(brand) ? { text: brand.text, position: brand.position } : undefined;

  const captured = useMemo(
    () => (shots ?? []).filter((s) => s.captured && s.image_path).sort((a, b) => a.position - b.position),
    [shots]
  );

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
  const stageH = Math.round(width * 0.75); // 4:3, like the web viewer stage

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="back" variant="ghost" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        <Text variant="heading" numberOfLines={1} style={styles.title}>
          {project?.name || t('preview.title')}
        </Text>
        <Text variant="caption" muted style={styles.counter}>
          {captured.length ? `${index + 1} / ${captured.length}` : ''}
        </Text>
      </View>

      {captured.length === 0 ? (
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
        <FlatList
          data={captured}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <ShotPreview shot={item} width={stageW} height={stageH} locale={locale} watermark={watermark} />
          )}
        />
      )}
    </SafeAreaView>
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
  locale: ReturnType<typeof useLocale>;
  watermark?: { text: string; position: import('@/features/branding/brand').WatermarkPosition };
}) {
  const canvasRef = useCanvasRef(); // required by StudioCanvas (export ref); unused here
  const { data: originalUri } = useShotSignedUrl(shot.image_path);
  const { data: cutoutUri } = useShotSignedUrl(shot.cutout_path ?? null);
  const slot = getSlot(shot.slot);
  const ready = Boolean(originalUri || cutoutUri);

  return (
    <View style={{ width }}>
      <View style={[styles.stage, { height }]}>
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
      </View>
      <Text variant="bodyStrong" center style={styles.caption} numberOfLines={1}>
        {slot ? localizedLabel(slot, locale) : shot.slot}
      </Text>
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
  stage: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { marginTop: spacing.md, paddingHorizontal: spacing.lg },
});
