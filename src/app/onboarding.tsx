import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useIntro } from '@/features/onboarding/introStore';
import { useT } from '@/lib/i18n';
import { colors, hitSlop, radius, shadow, spacing } from '@/theme';

const STUDIO: [string, string] = ['#E9EDF2', '#C3CCD6'];

// --- Illustrations: built from the design system, no photographic content ----

function CaptureArt() {
  const tiles: ('done' | 'active' | 'todo')[] = ['done', 'done', 'done', 'active', 'todo', 'todo'];
  return (
    <View style={[art.card, shadow.md]}>
      <View style={art.head}>
        <View style={art.pill}>
          <Text variant="label" color={colors.primaryText}>
            4 / 6
          </Text>
        </View>
        <Icon name="camera" size={18} color={colors.textMuted} />
      </View>
      <View style={art.grid}>
        {tiles.map((state, i) => (
          <View key={i} style={[art.tile, state === 'active' && art.tileActive]}>
            {state === 'done' ? <Icon name="check" size={16} color={colors.success} /> : null}
            {state === 'active' ? <Icon name="camera" size={16} color={colors.primary} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function StudioArt() {
  return (
    <View style={art.studioWrap}>
      <View style={art.checker}>
        <View style={art.checkRow}>
          <View style={[art.checkCell, art.checkDark]} />
          <View style={art.checkCell} />
        </View>
        <View style={art.checkRow}>
          <View style={art.checkCell} />
          <View style={[art.checkCell, art.checkDark]} />
        </View>
      </View>
      <LinearGradient colors={STUDIO} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[art.studioCard, shadow.md]}>
        <View style={art.ground} />
      </LinearGradient>
      <View style={[art.cutBadge, shadow.sm]}>
        <Icon name="scissors" size={18} color={colors.primary} />
      </View>
    </View>
  );
}

function ShareArt() {
  return (
    <View style={[art.card, shadow.md]}>
      <View style={art.head}>
        <View style={art.pill}>
          <Text variant="label" color={colors.primaryText}>
            360°
          </Text>
        </View>
        <Icon name="share" size={18} color={colors.textMuted} />
      </View>
      <View style={art.stage}>
        <View style={[art.pin, { left: '28%', top: '38%', backgroundColor: colors.marketing }]}>
          <Text variant="label" color={colors.primaryText}>
            1
          </Text>
        </View>
        <View style={[art.pin, { left: '62%', top: '58%', backgroundColor: colors.inspectionHigh }]}>
          <Text variant="label" color={colors.primaryText}>
            2
          </Text>
        </View>
      </View>
      <View style={art.galleryRow}>
        <View style={art.galTile} />
        <View style={art.galTile} />
        <View style={art.galTile} />
      </View>
      <View style={art.linkPill}>
        <Icon name="bolt" size={14} color={colors.primary} />
        <Text variant="caption" muted>
          carstudio.link
        </Text>
      </View>
    </View>
  );
}

export default function Onboarding() {
  const t = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const complete = useIntro((s) => s.complete);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slides = [
    { key: 's1', art: <CaptureArt />, title: t('onboarding.s1Title'), body: t('onboarding.s1Body') },
    { key: 's2', art: <StudioArt />, title: t('onboarding.s2Title'), body: t('onboarding.s2Body') },
    { key: 's3', art: <ShareArt />, title: t('onboarding.s3Title'), body: t('onboarding.s3Body') },
  ];
  const last = index === slides.length - 1;

  const finish = async () => {
    await complete();
    router.replace('/sign-in');
  };

  const next = () => {
    if (last) {
      void finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (i !== index) setIndex(i);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => void finish()} hitSlop={hitSlop} accessibilityRole="button">
          <Text variant="bodyStrong" muted>
            {t('onboarding.skip')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
      >
        {slides.map((s) => (
          <View key={s.key} style={[styles.slide, { width }]}>
            <View style={styles.artZone}>{s.art}</View>
            <View style={styles.copy}>
              <Text variant="title" center>
                {s.title}
              </Text>
              <Text variant="body" muted center style={styles.body}>
                {s.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button title={last ? t('onboarding.getStarted') : t('onboarding.next')} size="lg" onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const CARD = 264;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.xxl },
  artZone: { height: 280, alignItems: 'center', justifyContent: 'center' },
  copy: { alignItems: 'center', gap: spacing.sm, maxWidth: 340 },
  body: { maxWidth: 320 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
});

const art = StyleSheet.create({
  card: {
    width: CARD,
    backgroundColor: colors.elevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surface },

  studioWrap: { width: CARD, height: 200, alignItems: 'center', justifyContent: 'center' },
  studioCard: {
    width: CARD,
    height: 176,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  ground: {
    width: '64%',
    height: 16,
    marginBottom: 22,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20,21,26,0.20)',
  },
  checker: {
    position: 'absolute',
    top: 0,
    left: 18,
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 2,
  },
  checkRow: { flexDirection: 'row', flex: 1 },
  checkCell: { flex: 1, backgroundColor: '#FFFFFF' },
  checkDark: { backgroundColor: '#E6E9F0' },
  cutBadge: {
    position: 'absolute',
    right: 16,
    top: 8,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  stage: {
    height: 132,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryRow: { flexDirection: 'row', gap: spacing.sm },
  galTile: { flex: 1, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
