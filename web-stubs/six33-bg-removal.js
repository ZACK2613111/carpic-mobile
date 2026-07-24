// Web stub for @six33/react-native-bg-removal (native ML Kit / Vision).
// On-device background removal is native-only; on web it reports "unsupported"
// and returns the source image untouched. Never loaded on iOS/Android
// (see metro.config.js — resolved only when platform === 'web').
export async function isNativeBackgroundRemovalSupported() {
  return false;
}
export async function removeBackground(imageUri) {
  return imageUri;
}
