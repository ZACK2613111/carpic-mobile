const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Several native modules (device photo library, on-device ML background removal,
// audio recording) have no web build and throw at import time. Because
// expo-router eagerly imports every route, a single such import crashes the whole
// app in the browser. Map them to harmless web stubs so the app can boot for a
// visual/UI review. This applies ONLY to platform === 'web'; native builds
// resolve the real modules unchanged.
const WEB_STUBS = {
  'expo-media-library': path.resolve(__dirname, 'web-stubs/expo-media-library.js'),
  'expo-audio': path.resolve(__dirname, 'web-stubs/expo-audio.js'),
  '@six33/react-native-bg-removal': path.resolve(__dirname, 'web-stubs/six33-bg-removal.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
