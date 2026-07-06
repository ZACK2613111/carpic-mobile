const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the published web viewer (web/viewer.html) as an asset so publish can
// upload it to the public bucket.
config.resolver.assetExts.push('html');

module.exports = config;
