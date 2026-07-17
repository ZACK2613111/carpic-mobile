// Expo config plugin: make ML Kit Subject Segmentation download its model at
// install time (via Google Play Services) instead of on first use. This lets the
// Android on-device background removal work offline after the first install,
// rather than failing on a fresh, offline device.
//
// It injects into AndroidManifest.xml, inside <application>:
//   <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES"
//              android:value="subject_segment" />
//
// NOTE: the token MUST be "subject_segment" (ML Kit's short-form dependency
// name, matching the library's own manifest) — "subject_segmentation" is
// silently ignored by Play Services and the model would only download on
// first use, defeating the offline goal.
// Docs: https://developers.google.com/ml-kit/vision/subject-segmentation/android

const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const META_NAME = 'com.google.mlkit.vision.DEPENDENCIES';
const META_VALUE = 'subject_segment';

/** @param {import('@expo/config-plugins').ExportedConfig} config */
module.exports = function withMlKitSubjectSegmentation(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application['meta-data'] = application['meta-data'] || [];

    const existing = application['meta-data'].find(
      (item) => item.$ && item.$['android:name'] === META_NAME
    );

    if (existing) {
      // If ML Kit deps already declared, append ours if not present.
      const current = existing.$['android:value'] || '';
      if (!current.split(',').map((s) => s.trim()).includes(META_VALUE)) {
        existing.$['android:value'] = current ? `${current},${META_VALUE}` : META_VALUE;
      }
    } else {
      application['meta-data'].push({
        $: { 'android:name': META_NAME, 'android:value': META_VALUE },
      });
    }

    return cfg;
  });
};
