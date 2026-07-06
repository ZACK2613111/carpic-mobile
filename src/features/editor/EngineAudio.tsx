import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';

type Props = {
  audioUrl: string | null;
  onRecorded: (uri: string) => void | Promise<void>;
};

export function EngineAudio({ audioUrl, onRecorded }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(audioUrl ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);
  const [busy, setBusy] = useState(false);

  // Always leave recording mode disabled when this control goes away (e.g. the
  // user navigates off the engine shot mid-recording).
  useEffect(() => {
    return () => {
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, []);

  const start = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'Allow the microphone to record the engine sound.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      haptics.medium();
    } catch (e) {
      Alert.alert('Recording failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      haptics.success();
      if (recorder.uri) await onRecorded(recorder.uri);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const togglePlay = async () => {
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    try {
      await player.seekTo(0);
    } catch {
      // ignore
    }
    try {
      player.play();
    } catch {
      Alert.alert('Playback failed', 'Could not play this recording.');
    }
  };

  return (
    <View style={styles.row}>
      {recState.isRecording ? (
        <PressableScale style={[styles.recBtn, styles.recording]} onPress={stop} disabled={busy}>
          <View style={styles.stopSquare} />
          <Text variant="bodyStrong" color="#FFFFFF">
            Stop · {Math.round(recState.durationMillis / 1000)}s
          </Text>
        </PressableScale>
      ) : (
        <PressableScale style={styles.recBtn} onPress={start} haptic="medium">
          <Icon name="mic" size={18} color={colors.danger} />
          <Text variant="bodyStrong">{audioUrl ? 'Re-record engine' : 'Record engine sound'}</Text>
        </PressableScale>
      )}

      {audioUrl && !recState.isRecording ? (
        <IconButton
          name={playerStatus.playing ? 'pause' : 'play'}
          variant="surface"
          accessibilityLabel={playerStatus.playing ? 'Pause' : 'Play engine sound'}
          onPress={togglePlay}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  recording: { backgroundColor: colors.danger, borderColor: colors.danger },
  stopSquare: { width: 14, height: 14, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
