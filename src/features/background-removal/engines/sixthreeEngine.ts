import {
  isNativeBackgroundRemovalSupported,
  removeBackground,
} from '@six33/react-native-bg-removal';

import type { BgRemovalEngine } from '../types';

// Primary engine: fully on-device, offline.
//  - iOS 17+  -> Vision VNGenerateForegroundInstanceMaskRequest
//  - Android  -> ML Kit Subject Segmentation
// Returns a trimmed transparent PNG. Requires a development build (not Expo Go)
// and, on iOS, a REAL device (the simulator returns the original image).
export const sixthreeEngine: BgRemovalEngine = {
  id: 'six33',
  name: 'On-device (Vision / ML Kit)',

  async isSupported() {
    try {
      return await isNativeBackgroundRemovalSupported();
    } catch {
      return false;
    }
  },

  async removeBackground(imageUri: string) {
    const uri = await removeBackground(imageUri, { trim: true });
    return { uri };
  },
};
