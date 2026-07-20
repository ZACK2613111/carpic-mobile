import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { CaptureFlash, type CaptureFlashHandle } from '@/features/capture/CaptureFlash';
import { Filmstrip } from '@/features/capture/Filmstrip';
import { GuideOverlay } from '@/features/capture/GuideOverlay';
import { setCapturePrefs, useCapturePrefs } from '@/features/capture/capturePrefs';
import { SHOT_TEMPLATE, slotPosition } from '@/features/capture/shotTemplate';
import { useHorizonLevel } from '@/features/capture/useHorizonLevel';
import type { Shot } from '@/features/shots/types';
import { useShots } from '@/features/shots/useShots';
import { enqueueShotUpload, type ShotUploadPayload } from '@/features/uploads/uploads';
import { usePendingUploads } from '@/features/uploads/usePendingUploads';
import { haptics } from '@/lib/haptics';
import { deleteLocal, prepareForUpload } from '@/lib/imagePrep';
import { uploadFileUri } from '@/lib/uploadQueue';
import { colors, radius, spacing } from '@/theme';

// A photo bound to its slot metadata AT capture time, so a re-render that moves
// `index` can never write it to the wrong slot.
type PendingShot = {
  uri: string;
  width?: number;
  height?: number;
  slotId: string;
  section: string;
  position: number;
};

export default function CaptureScreen() {
  useKeepAwake(); // a full guided session takes minutes — don't let the screen sleep mid-shoot
  const { id, start } = useLocalSearchParams<{ id: string; start?: string }>();
  const router = useRouter();
  const toast = useToast();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const prefs = useCapturePrefs();
  const level = useHorizonLevel(prefs.level);

  const [index, setIndex] = useState(() => (start ? slotPosition(start) : 0));
  const [pending, setPending] = useState<PendingShot | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Synchronous latch: the async `busy`/`pending` setState guards don't block a
  // rapid double-tap during a burst; this does.
  const inFlight = useRef(false);
  const flashRef = useRef<CaptureFlashHandle>(null);
  // Fast mode stashes into the durable outbox in the background (like the spin
  // screen) so the shutter stays snappy; only the terminal frame awaits them.
  const stashes = useRef<Promise<void>[]>([]);
  const stashFailures = useRef(0);

  const total = SHOT_TEMPLATE.length;
  const slot = SHOT_TEMPLATE[index];

  // Captured + queued shots, keyed by slot, for the filmstrip.
  const { data: shots } = useShots(id);
  const pendingUploads = usePendingUploads(id);
  const bySlot = useMemo(() => {
    const m: Record<string, Shot> = {};
    (shots ?? []).forEach((s) => {
      m[s.slot] = s;
    });
    return m;
  }, [shots]);
  const pendingUriBySlot = useMemo(() => {
    const m: Record<string, string> = {};
    pendingUploads.forEach((t) => {
      if (t.kind === 'shot') m[(t.payload as ShotUploadPayload).slot] = uploadFileUri(t);
    });
    return m;
  }, [pendingUploads]);

  const advance = useCallback(() => {
    setPending(null);
    if (index >= total - 1) router.back();
    else setIndex((i) => i + 1);
  }, [index, total, router]);

  // Resize → durable outbox → (upload happens later in the queue, with retry).
  const doEnqueue = useCallback(
    async (shot: PendingShot) => {
      const prepared = await prepareForUpload(shot.uri, shot.width, shot.height);
      await enqueueShotUpload({
        projectId: id,
        slot: shot.slotId,
        section: shot.section,
        position: shot.position,
        sourceUri: prepared.uri,
      });
      void deleteLocal(shot.uri);
      if (prepared.resized) void deleteLocal(prepared.uri);
    },
    [id]
  );

  // Review mode: awaited save, then advance.
  const commitShot = useCallback(
    async (shot: PendingShot) => {
      setBusy(true);
      try {
        await doEnqueue(shot);
        haptics.success();
        advance();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'Could not save the photo', 'error');
      } finally {
        setBusy(false);
      }
    },
    [doEnqueue, advance, toast]
  );

  // Fast mode: fire-and-forget stash so the burst never blocks on I/O.
  const stashShot = useCallback(
    (shot: PendingShot) => {
      const task = doEnqueue(shot).catch(() => {
        stashFailures.current += 1;
      });
      stashes.current.push(task);
    },
    [doEnqueue]
  );

  const onShutter = useCallback(async () => {
    if (inFlight.current || pending || !slot || !cameraReady) return;
    inFlight.current = true;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8, shutterSound: !prefs.fastMode });
      if (photo?.uri) {
        const shot: PendingShot = {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          slotId: slot.id,
          section: slot.group,
          position: index,
        };
        if (prefs.fastMode) {
          flashRef.current?.flash();
          haptics.medium();
          stashShot(shot);
          if (index >= total - 1) {
            await Promise.all(stashes.current).catch(() => {});
            if (stashFailures.current > 0) {
              toast.show('Some photos could not be saved — check free storage', 'error');
            }
            router.back();
          } else {
            setIndex((i) => i + 1);
          }
        } else {
          haptics.medium();
          setPending(shot);
        }
      }
    } catch {
      toast.show('Could not take the photo', 'error');
    } finally {
      inFlight.current = false;
    }
  }, [pending, slot, cameraReady, prefs.fastMode, index, total, stashShot, router, toast]);

  const onUse = useCallback(() => {
    if (pending) void commitShot(pending);
  }, [pending, commitShot]);

  const jumpTo = useCallback(
    (i: number) => {
      if (pending) return; // don't switch slots mid-review
      setIndex(i);
    },
    [pending]
  );

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
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      {/* live guide */}
      {!pending && slot ? (
        <GuideOverlay
          guide={slot.guide}
          label={`${slot.label} · ${slot.labelFr}`}
          grid={prefs.grid}
          showLevel={prefs.level && level.available}
          levelStatus={level.status}
          roll={level.roll}
        />
      ) : null}

      {/* review of the just-taken photo */}
      {pending ? (
        <View style={styles.review}>
          <Image source={{ uri: pending.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </View>
      ) : null}

      <CaptureFlash ref={flashRef} />

      <SafeAreaView style={styles.ui} edges={['top', 'bottom']} pointerEvents="box-none">
        {/* top bar */}
        <View style={styles.topBar}>
          <IconButton name="close" variant="surface" accessibilityLabel="Close" onPress={() => router.back()} />
          <View style={styles.progressPill}>
            <Text variant="caption" color="#FFFFFF">
              {index + 1} / {total}
            </Text>
          </View>
          <IconButton
            name="grid"
            variant={prefs.grid ? 'primary' : 'surface'}
            accessibilityLabel="Toggle grid"
            onPress={() => setCapturePrefs({ grid: !prefs.grid })}
          />
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
            <>
              <Filmstrip
                bySlot={bySlot}
                pendingUriBySlot={pendingUriBySlot}
                currentIndex={index}
                onJump={jumpTo}
              />
              <View style={styles.shutterRow}>
                <View style={styles.sideLeft}>
                  <Button title="Skip" variant="ghost" onPress={advance} />
                </View>
                <PressableScale style={styles.shutterOuter} onPress={onShutter} haptic="medium">
                  <View style={styles.shutterInner} />
                </PressableScale>
                <View style={styles.sideRight}>
                  <ModeToggle fast={prefs.fastMode} onToggle={() => setCapturePrefs({ fastMode: !prefs.fastMode })} />
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function ModeToggle({ fast, onToggle }: { fast: boolean; onToggle: () => void }) {
  return (
    <PressableScale style={styles.modeToggle} onPress={onToggle} haptic="selection" accessibilityLabel="Toggle fast capture">
      <View style={[styles.modeOpt, !fast && styles.modeOptOn]}>
        <Text variant="label" color={!fast ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}>
          Review
        </Text>
      </View>
      <View style={[styles.modeOpt, fast && styles.modeOptOn]}>
        <Icon name="bolt" size={12} color={fast ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} />
        <Text variant="label" color={fast ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}>
          Fast
        </Text>
      </View>
    </PressableScale>
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
  bottom: { padding: spacing.lg, gap: spacing.md },
  reviewBar: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideLeft: { flex: 1, alignItems: 'flex-start' },
  sideRight: { flex: 1, alignItems: 'flex-end' },
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.scrim,
    borderRadius: radius.pill,
    padding: 3,
  },
  modeOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  modeOptOn: { backgroundColor: colors.primary },
});
