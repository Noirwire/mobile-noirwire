import Constants from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { configureHttp } from "@noirwire/shared/infrastructure";
import { assertRuntime, inProcessLocks, installPlatform } from "@noirwire/shared/platform";
import { AppState, Platform } from "react-native";
import { appActivity, type AppActivity } from "./activity";
import { biometricKeystore, type BiometricKeystore } from "./biometricKeystore";
import { buildSettings, mobileEnv } from "./env";
import { fileVault } from "./fileVault";
import { mobileHttpConfig } from "./httpConfig";
import { vaultPreferences, type Preferences } from "./preferences";
import { relayTrack, screenPath } from "./track";
import { deviceVaultFiles } from "./vaultFiles";

export type Installed = {
  activity: AppActivity;
  preferences: Preferences;
  biometrics: BiometricKeystore;
};

let installed: Installed | null = null;
let currentScreen = "/";

/** Called by the root layout on every route change, so events are counted against the screen they came from. */
export function noteScreen(pathname: string) {
  currentScreen = screenPath(pathname);
}

export function installedPlatform(): Installed {
  if (!installed) throw new Error("installMobilePlatform() has not run.");
  return installed;
}

/**
 * Wires this app into the shared package, once, after the runtime checks
 * pass and before any screen reads the wallet. Throws on a runtime or build
 * setting the wallet must not run with.
 */
export async function installMobilePlatform(): Promise<Installed> {
  if (installed) return installed;
  assertRuntime();
  const { env, relayUrl } = mobileEnv(buildSettings());
  const http = mobileHttpConfig(relayUrl, Constants.expoConfig?.version ?? "0.0.0");
  const locks = inProcessLocks();
  const vault = fileVault(deviceVaultFiles(), locks);
  const preferences = vaultPreferences(vault);
  const activity = appActivity(AppState);

  configureHttp(http);
  installPlatform({
    vault,
    env,
    activity,
    locks,
    track: relayTrack({
      http,
      enabled: preferences.analyticsEnabled,
      screen: () => currentScreen,
      fetch: (...args) => fetch(...args),
      later: (run, ms) => void setTimeout(run, ms),
      random: Math.random,
    }),
  });
  await preferences.load();

  installed = {
    activity,
    preferences,
    biometrics: biometricKeystore({
      auth: LocalAuthentication,
      secure: SecureStore,
      os: Platform.OS,
    }),
  };
  return installed;
}
