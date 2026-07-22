import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { EMPTY_SPIN } from '@/features/projects/types';
import { saveSpin } from '@/features/spin/spin.api';
import { enqueueSpinFrameUpload } from '@/features/uploads/uploads';
import { haptics } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { deleteLocal, prepareForUpload } from '@/lib/imagePrep';
import { colors, radius, spacing } from '@/theme';

const TARGET = 24;
const MIN_FRAMES = 8;
const RING = 46;
const CIRC = 2 * Math.PI * RING;

export default function SpinCaptureScreen() {
  useKeepAwake(); // walking around the car takes a while — keep the screen on
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  // Frames are resized then stashed in the durable upload queue in the background
  // so the shutter stays responsive. Only the LOCAL stash is awaited at finish —
  // the network uploads happen in the queue, with retry, even after leaving.
  const stashes = useRef<Promise<void>[]>([]);
  const stashFailures = useRef(0);

  const progress = Math.min(1, Math.max(0, count / TARGET));

  const queueFrame = useCallback(
    (index: number, uri: string, width?: number, height?: number) => {
      const task = (async () => {
        // Downscale before queueing: 24 raw sensor frames would cost tens of MB
        // of mobile data per spin. Falls back to the raw photo if resizing fails.
        let stashUri = uri;
        let resized = false;
        try {
          const prepared = await prepareForUpload(uri, width, height);
          stashUri = prepared.uri;
          resized = prepared.resized;
        } catch {
          // queue the raw frame rather than dropping it
        }
        await enqueueSpinFrameUpload({ projectId: id, frame: index, sourceUri: stashUri });
        // the outbox holds its own durable copy — free the temp files
        void deleteLocal(uri);
        if (resized) void deleteLocal(stashUri);
      })().catch(() => {
        stashFailures.current += 1;
      });
      stashes.current.push(task);
    },
    [id]
  );

  const finish = useCallback(
    async (frames: number) => {
      setBusy(true);
      try {
        // Local-only wait (file copies into the outbox) — fast even offline.
        await Promise.all(stashes.current);
        try {
          await saveSpin(id, { ...EMPTY_SPIN, frameCount: frames });
        } catch {
          // Offline: the queue raises frameCount as each frame syncs
          // (ensureSpinFrameCount) — nothing is lost, no need to block here.
        }
        haptics.success();
        if (stashFailures.current > 0) {
          toast.show(
            t(stashFailures.current === 1 ? 'capture.framesFailedOne' : 'capture.framesFailedMany', {
              n: stashFailures.current,
            }),
            'error'
          );
        } else {
          toast.show(t('spin.captured', { n: frames }), 'success');
        }
        router.replace({ pathname: '/spin/[id]', params: { id } });
      } finally {
        setBusy(false);
      }
    },
    [id, router, toast, t]
  );

  const onShutter = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        const frameIndex = count;
        const next = count + 1;
        queueFrame(frameIndex, photo.uri, photo.width, photo.height); // stash + queue in the background, don't block
        setCount(next);
        haptics.medium();
        if (next >= TARGET) {
          await finish(next);
        }
      }
    } catch {
      toast.show(t('capture.frameFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }, [busy, count, queueFrame, finish, toast, t]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Text variant="heading" center>
          {t('capture.cameraNeededTitle')}
        </Text>
        <Button title={t('capture.grantCamera')} icon="camera" onPress={requestPermission} />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      {/* Black viewfinder — force light status-bar icons so the clock/battery stay visible. */}
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={styles.ui} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <IconButton name="close" variant="surface" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
          <View style={styles.hintPill}>
            <Text variant="caption" color="#FFFFFF">
              {t('spin.walkHint')}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.ringWrap} pointerEvents="none">
          <Svg width={120} height={120}>
            <Circle cx={60} cy={60} r={RING} stroke="rgba(255,255,255,0.25)" strokeWidth={6} fill="none" />
            <Circle
              cx={60}
              cy={60}
              r={RING}
              stroke={colors.primary}
              strokeWidth={6}
              fill="none"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </Svg>
          <View style={styles.ringLabel}>
            <Text variant="title" color="#FFFFFF">
              {count}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.8)">
              {t('spin.of', { n: TARGET })}
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.side}>
            {count >= MIN_FRAMES ? <Button title={t('spin.finish')} variant="secondary" onPress={() => finish(count)} /> : null}
          </View>
          <PressableScale style={styles.shutterOuter} onPress={onShutter} haptic="medium" disabled={busy}>
            <View style={styles.shutterInner} />
          </PressableScale>
          <View style={styles.side} />
        </View>
      </SafeAreaView>

      {busy ? (
        <View style={styles.busy} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  permWrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  ui: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  hintPill: {
    flex: 1,
    marginHorizontal: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.scrim,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  ringWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  side: { width: 96, alignItems: 'center' },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
