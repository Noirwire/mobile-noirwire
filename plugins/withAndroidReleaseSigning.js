const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Wires a real release keystore into the generated Android project, read at
 * Gradle-run time from environment variables (not baked in at `expo
 * prebuild` time, so the same generated project works in any shell that has
 * them set). Without those variables, `assembleRelease` and `bundleRelease`
 * refuse with a clear error instead of Expo's template default, which
 * quietly signs the release build with the debug key.
 *
 * `expo prebuild` regenerates `android/app/build.gradle` from scratch every
 * time, so this has to run as a plugin rather than a one-off manual edit.
 */

const ENV_VARS = [
  "NOIRWIRE_ANDROID_KEYSTORE_PATH",
  "NOIRWIRE_ANDROID_KEYSTORE_PASSWORD",
  "NOIRWIRE_ANDROID_KEY_ALIAS",
  "NOIRWIRE_ANDROID_KEY_PASSWORD",
];

const ENV_READ = `
def noirwireKeystorePath = System.getenv("NOIRWIRE_ANDROID_KEYSTORE_PATH")
def noirwireKeystorePassword = System.getenv("NOIRWIRE_ANDROID_KEYSTORE_PASSWORD")
def noirwireKeyAlias = System.getenv("NOIRWIRE_ANDROID_KEY_ALIAS")
def noirwireKeyPassword = System.getenv("NOIRWIRE_ANDROID_KEY_PASSWORD")
def noirwireHasReleaseSigning = noirwireKeystorePath && noirwireKeystorePassword && noirwireKeyAlias && noirwireKeyPassword
`;

const TASK_GUARD = `
tasks.whenTaskAdded { task ->
    if (!noirwireHasReleaseSigning && (task.name == "assembleRelease" || task.name == "bundleRelease")) {
        task.doFirst {
            throw new GradleException(
                "Release signing is not configured. Set ${ENV_VARS.join(", ")} " +
                "before building a release (see README.md, Building locally)."
            )
        }
    }
}
`;

const SIGNING_CONFIGS_ANCHOR = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const RELEASE_SIGNING_CONFIG = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (noirwireHasReleaseSigning) {
                storeFile file(noirwireKeystorePath)
                storePassword noirwireKeystorePassword
                keyAlias noirwireKeyAlias
                keyPassword noirwireKeyPassword
            }
        }
    }`;

const RELEASE_BUILD_TYPE_ANCHOR = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const RELEASE_BUILD_TYPE_SIGNED = `        release {
            // Read from the environment at Gradle-run time; see withAndroidReleaseSigning.js.
            signingConfig noirwireHasReleaseSigning ? signingConfigs.release : null`;

function replaceOnce(contents, anchor, replacement, label) {
  if (!contents.includes(anchor)) {
    throw new Error(
      `withAndroidReleaseSigning: could not find the expected ${label} in android/app/build.gradle. ` +
        "The generated template changed; update plugins/withAndroidReleaseSigning.js to match it.",
    );
  }
  return contents.replace(anchor, replacement);
}

const withAndroidReleaseSigning = (config) =>
  withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    contents = replaceOnce(
      contents,
      SIGNING_CONFIGS_ANCHOR,
      RELEASE_SIGNING_CONFIG,
      "signingConfigs block",
    );
    contents = replaceOnce(
      contents,
      RELEASE_BUILD_TYPE_ANCHOR,
      RELEASE_BUILD_TYPE_SIGNED,
      "release buildType's signingConfig line",
    );
    contents = contents.replace(
      'apply plugin: "com.facebook.react"',
      `apply plugin: "com.facebook.react"\n${ENV_READ}${TASK_GUARD}`,
    );

    config.modResults.contents = contents;
    return config;
  });

module.exports = withAndroidReleaseSigning;
