const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Limits the APK to specific CPU architectures.
 * Default: arm64-v8a only (covers ~95% of Android devices since 2017).
 * This reduces native library size from ~70MB (all ABIs) to ~20MB (arm64 only).
 */
module.exports = function withAndroidAbiFilter(config, { abis = ['arm64-v8a'] } = {}) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('abiFilters')) {
      return config; // already configured
    }

    const abiString = abis.map((abi) => `"${abi}"`).join(', ');
    const ndkBlock = `\n        ndk {\n            abiFilters ${abiString}\n        }`;

    config.modResults.contents = contents.replace(
      /(\bdefaultConfig\s*\{)/,
      `$1${ndkBlock}`
    );

    return config;
  });
};
