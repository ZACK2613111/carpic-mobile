import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { saveSpin, uploadSpinFrame } from '@/features/spin/spin.api';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';

const TARGET = 24;
const MIN_FRAMES = 8;
const RING = 46;
const CIRC = 2 * Math.PI * RING;

export default function SpinCaptureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const progress = Math.min(1, Math.max(0, count / TARGET));

  const finish = useCallback(
    async (frames: number) => {
      setBusy(true);
      try {
        await saveSpin(id, { ...EMPTY_SPIN, frameCount: frames });
        haptics.success();
        toast.show(`360° captured (${frames} frames)`, 'success');
        router.replace({ pathname: '/spin/[id]', params: { id } });
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'Could not save 360', 'error');
      } finally {
        setBusy(false);
      }
    },
    [id, router, toast]
  );

  const onShutter = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        await uploadSpinFrame(id, count, photo.uri, false);
        const next = count + 1;
        setCount(next);
        haptics.medium();
        if (next >= TARGET) {
          await finish(next);
        }
      }
    } catch {
      toast.show('Could not capture the frame', 'error');
    } finally {
      setBusy(false);
    }
  }, [busy, count, id, finish, toast]);

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
          Camera access needed
        </Text>
        <Button title="Grant camera access" icon="camera" onPress={requestPermission} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <SafeAreaView style={styles.ui} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <IconButton name="close" variant="surface" accessibilityLabel="Close" onPress={() => router.back()} />
          <View style={styles.hintPill}>
            <Text variant="caption" color="#FFFFFF">
              Walk around the car · shoot every ~15°
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
              of {TARGET}
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.side}>
            {count >= MIN_FRAMES ? <Button title="Finish" variant="secondary" onPress={() => finish(count)} /> : null}
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
