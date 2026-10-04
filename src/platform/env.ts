import type { Env } from "@noirwire/shared/platform";
import { envFrom } from "@noirwire/shared/infrastructure";

export type BuildSettings = {
  network: string | undefined;
  apiUrl: string | undefined;
  /** True in a development build, where an API on this machine may be reached over plain http. */
  development: boolean;
};

/**
 * The build's settings, checked once at start so a bad build fails there
 * rather than at a first request. The shared package decides what is
 * acceptable; a refusal names the two variables it was read from, which is
 * what a development build shows on its failure screen.
 */
export function mobileEnv(settings: BuildSettings): Env {
  try {
    return envFrom({
      network: settings.network,
      apiBaseUrl: settings.apiUrl,
      platform: "mobile",
      development: settings.development,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${reason} Check EXPO_PUBLIC_API_URL and EXPO_PUBLIC_SOLANA_NETWORK in .env, then restart Metro with "npm start -- --clear".`,
    );
  }
}

/** Read with each name written out in full, which is how Expo inlines public variables into a build. */
export function buildSettings(): BuildSettings {
  return {
    network: process.env.EXPO_PUBLIC_SOLANA_NETWORK,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    development: __DEV__,
  };
}
