// Web stub for expo-audio (a native module). Engine-sound recording/playback is
// native-only; on web these are inert so the editor can render for a UI review.
// Never loaded on iOS/Android (see metro.config.js — web-only resolution).
export const RecordingPresets = { HIGH_QUALITY: {}, LOW_QUALITY: {} };

export async function requestRecordingPermissionsAsync() {
  return { granted: false, canAskAgain: false, status: 'denied', expires: 'never' };
}
export async function setAudioModeAsync() {}

const recorder = {
  prepareToRecordAsync: async () => {},
  record() {},
  stop: async () => {},
  pause() {},
  uri: null,
};
export function useAudioRecorder() {
  return recorder;
}
export function useAudioRecorderState() {
  return { isRecording: false, durationMillis: 0, url: null };
}

const player = { play() {}, pause() {}, seekTo: async () => {}, remove() {} };
export function useAudioPlayer() {
  return player;
}
export function useAudioPlayerStatus() {
  return { playing: false, isLoaded: false, currentTime: 0, duration: 0, didJustFinish: false };
}
