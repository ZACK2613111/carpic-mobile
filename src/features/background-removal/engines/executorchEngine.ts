import type { BgRemovalEngine } from '../types';

// Fallback engine (NOT installed by default).
//
// react-native-executorch runs a bundled DeepLabV3 model fully offline and its
// Pascal-VOC label set includes a "car" class. It is the insurance option if the
// primary native engine is ever unavailable or removed upstream. Because it pulls
// in a large native runtime + model, it is intentionally left uninstalled.
//
// To enable it (see README > "Swapping the background-removal engine"):
//   1. npx expo install react-native-executorch
//   2. implement removeBackground() below using useSemanticSegmentation /
//      the DeepLabV3 model, keeping the "car" class, upscaling the mask, and
//      compositing the alpha (e.g. with Skia).
//   3. point registry.ts `activeEngine` at this engine.
export const executorchEngine: BgRemovalEngine = {
  id: 'executorch',
  name: 'On-device DeepLabV3 (fallback, not installed)',

  async isSupported() {
    return false;
  },

  async removeBackground() {
    throw new Error(
      'Executorch fallback engine is not installed. See README > "Swapping the background-removal engine".'
    );
  },
};
