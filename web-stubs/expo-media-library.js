// Web stub for expo-media-library (a native module with no web build).
// Saving exports to the device photo library is native-only; on web these
// calls no-op so the app can boot for a UI review. Never loaded on iOS/Android
// (see metro.config.js — this file is resolved only when platform === 'web').
export async function requestPermissionsAsync() {
  return { granted: false, canAskAgain: false, status: 'denied', expires: 'never' };
}
export async function saveToLibraryAsync() {}
