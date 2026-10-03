import type { Env } from "@noirwire/shared/platform";
import { envFrom } from "@noirwire/shared/infrastructure";

export type BuildSettings = {
  network: string | undefined;
  relayUrl: string | undefined;
};

export type MobileEnv = { env: Env; relayUrl: string };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

/**
 * The relay's base URL: https, or plain http to a development machine only.
 * No path, query or trailing slash, because route paths are appended to it.
 */
function relayBase(value: string | undefined): string {
  let url: URL;
  try {
    url = new URL(value?.trim() ?? "");
  } catch {
    throw new Error(
      "EXPO_PUBLIC_RELAY_URL must be the relay's address, such as https://app.noirwire.com.",
    );
  }
  const local = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !local) {
    throw new Error("EXPO_PUBLIC_RELAY_URL must use https.");
  }
  if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
    throw new Error("EXPO_PUBLIC_RELAY_URL must be an origin with no path.");
  }
  return url.origin;
}

/** The build's settings, checked once at start so a bad build fails there rather than at a first request. */
export function mobileEnv(settings: BuildSettings): MobileEnv {
  return { env: envFrom({ network: settings.network }), relayUrl: relayBase(settings.relayUrl) };
}

/** Read with each name written out in full, which is how Expo inlines public variables into a build. */
export function buildSettings(): BuildSettings {
  return {
    network: process.env.EXPO_PUBLIC_SOLANA_NETWORK,
    relayUrl: process.env.EXPO_PUBLIC_RELAY_URL,
  };
}
