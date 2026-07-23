import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { uploadHotspotPhoto } from '@/features/shots/shots.api';
import { t } from '@/lib/i18n';
import { deleteLocal, prepareForUpload } from '@/lib/imagePrep';

function chooseSource(): Promise<'camera' | 'library' | null> {
  return new Promise((resolve) => {
    Alert.alert(t('hotspot.sourceTitle'), undefined, [
      { text: t('hotspot.takePhoto'), onPress: () => resolve('camera') },
      { text: t('hotspot.chooseLibrary'), onPress: () => resolve('library') },
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/**
 * Pick (camera or library) → resize → upload a hotspot's close-up photo, and
 * return its storage path. Returns null when the user cancels or something
 * fails — errors are surfaced here, so callers only deal with path | null.
 * Shared by the shot editor and the 360 screen so both behave identically.
 */
export async function pickAndUploadHotspotPhoto(projectId: string, key: string): Promise<string | null> {
  const source = await chooseSource();
  if (!source) return null;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('hotspot.sourceTitle'), t('hotspot.cameraNeeded'));
      return null;
    }
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('hotspot.sourceTitle'), t('hotspot.libraryNeeded'));
      return null;
    }
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;

  try {
    // Same 2000px resize rule as capture — a close-up doesn't need a 12 MP file.
    const prepared = await prepareForUpload(asset.uri, asset.width, asset.height);
    try {
      return await uploadHotspotPhoto(projectId, key, prepared.uri);
    } finally {
      if (prepared.resized) void deleteLocal(prepared.uri);
    }
  } catch (e) {
    Alert.alert(t('hotspot.photoFailed'), e instanceof Error ? e.message : t('common.tryAgain'));
    return null;
  }
}
