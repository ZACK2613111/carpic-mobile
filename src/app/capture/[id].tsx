import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { GuideOverlay } from '@/features/capture/GuideOverlay';
import { SHOT_TEMPLATE, slotPosition } from '@/features/capture/shotTemplate';
import { enqueueShotUpload } from '@/features/uploads/uploads';
import { haptics } from '@/lib/haptics';
import { deleteLocal, prepareForUpload } from '@/lib/imagePrep';
import { colors, radius, spacing } from '@/theme';

export default function CaptureScreen() {
  useKeepAwake(); // a full guided session takes minutes — don't let the screen sleep mid-shoot
  const { id, start } = useLocalSearchParams<{ id: string; start?: string }>();
  const router = useRouter();
  const toast = useToast();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [index, setIndex] = useState(() => (start ? slotPosition(start) : 0));
  // Bind slot metadata to the photo at capture time (not at approval time) so a
  // re-render that changes `index` can't write the wrong slot.
  const [pending, setPending] = useState<{
    uri: string;
    width?: number;
    height?: number;
    slotId: string;
    section: string;
    position: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const total = SHOT_TEMPLATE.length;
  const slot = SHOT_TEMPLATE[index];

  const advance = useCallback(() => {
    setPending(null);
    if (index >= total - 1) {
      router.back();
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, total, router]);

  const onShutter = useCallback(async () => {
    if (busy || pending || !slot) return;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        haptics.medium();
        setPending({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          slotId: slot.id,
          section: slot.group,
          position: index,
        });
      }
    } catch {
      toast.show('Could not take the photo', 'error');
    }
  }, [busy, pending, slot, index, toast]);

  const onUse = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    try {
      // Offline-first: resize, stash in the durable outbox, advance immediately.
      // The actual upload + DB row happen in the queue, with retry — no network
      // needed right now, and a failed upload can't lose the photo anymore.
      const prepared = await prepareForUpload(pending.uri, pending.width, pending.height);
      await enqueueShotUpload({
        projectId: id,
        slot: pending.slotId,
        section: pending.section,
        position: pending.position,
        sourceUri: prepared.uri,
      });
      haptics.success();
      void deleteLocal(pending.uri);
      if (prepared.resized) void deleteLocal(prepared.uri);
      advance();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save the photo', 'error');
    } finally {
      setBusy(false);
    }
  }, [pending, id, advance, toast]);

  // ---- permission gate ----
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
        <Text variant="body" muted center>
          CarStudio uses the camera for guided car photos.
        </Text>
        <Button title="Grant camera access" icon="camera" onPress={requestPermission} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* live guide */}
      {!pending && slot ? <GuideOverlay guide={slot.guide} label={`${slot.label} · ${slot.labelFr}`} /> : null}

      {/* review of the just-taken photo */}
      {pending ? (
        <View style={styles.review}>
          <Image source={{ uri: pending.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </View>
      ) : null}

      <SafeAreaView style={styles.ui} edges={['top', 'bottom']} pointerEvents="box-none">
        {/* top bar */}
        <View style={styles.topBar}>
          <IconButton name="close" variant="surface" accessibilityLabel="Close" onPress={() => router.back()} />
          <View style={styles.progressPill}>
            <Text variant="caption" color="#FFFFFF">
              {index + 1} / {total}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* bottom controls */}
        <View style={styles.bottom}>
          {pending ? (
            <View style={styles.reviewBar}>
              <Button
                title="Retake"
                variant="secondary"
                icon="refresh"
                onPress={() => {
                  setPending(null);
                  setBusy(false);
                }}
                style={styles.flex}
              />
              <Button title="Use photo" icon="check" onPress={onUse} loading={busy} style={styles.flex} />
            </View>
          ) : (
            <View style={styles.shutterRow}>
              <View style={styles.side}>
                <Button title="Skip" variant="ghost" onPress={advance} />
              </View>
              <PressableScale style={styles.shutterOuter} onPress={onShutter} haptic="medium">
                <View style={styles.shutterInner} />
              </PressableScale>
              <View style={styles.side} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  permWrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  review: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  ui: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  progressPill: {
    backgroundColor: colors.scrim,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  bottom: { padding: spacing.lg },
  reviewBar: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 88, alignItems: 'center' },
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
});
