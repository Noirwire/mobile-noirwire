import { installPlatform } from "@noirwire/shared/platform";
import {
  memoryPlatform,
  memoryVault,
  recordingTrack,
  type MemoryVault,
} from "@noirwire/shared/testing";
import { createWallet, lock, resetWallet, storeNewWallet } from "@noirwire/shared/wallet";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type { BiometricKeystore } from "@/platform/biometricKeystore";
import { vaultPreferences } from "@/platform/preferences";
import { biometricUnlock } from "./biometric/biometricUnlock";
import type { VaultKeyAccess } from "./biometric/vaultKeyAccess";
import { ServicesProvider, type AppServices } from "./services";

/** A password the shared strength check accepts. */
export const STRONG_PASSWORD = "harbor-velvet-orbit-canyon-meadow";

/** The shared store over an in-memory vault, with every event recorded. */
export function installTestPlatform(vault: MemoryVault = memoryVault()) {
  const recorded = recordingTrack();
  installPlatform(memoryPlatform({ vault, track: recorded.track }));
  return { vault, events: recorded.events };
}

/** A device with no biometrics: the default for screens that do not test them. */
export const noBiometrics: BiometricKeystore = {
  method: async () => null,
  store: async () => false,
  read: async () => ({ kind: "failed" }),
  remove: async () => true,
};

export async function testServices(
  overrides: Partial<AppServices> & {
    keystore?: BiometricKeystore;
    access?: VaultKeyAccess | null;
  } = {},
): Promise<AppServices> {
  const { keystore = noBiometrics, access = null, ...rest } = overrides;
  const preferences = rest.preferences ?? vaultPreferences(memoryVault());
  await preferences.load();
  return {
    preferences,
    biometric: biometricUnlock({ keystore, preferences, access }),
    resolveImport: () => Promise.reject(new Error("no network in tests")),
    readClipboard: async () => "",
    useOnline: () => true,
    ...rest,
  };
}

export function renderWith(services: AppServices, ui: ReactElement) {
  return render(<ServicesProvider services={services}>{ui}</ServicesProvider>);
}

/** A stored wallet, locked, as a cold start finds it. */
export async function storedLockedWallet() {
  const draft = createWallet();
  await storeNewWallet(draft.wallet, draft.phrase, STRONG_PASSWORD);
  lock();
  return draft;
}

/** Leaves the shared store as a fresh start would: no wallet, nothing unlocked, no timers. */
export async function forgetWallet() {
  lock();
  await resetWallet();
}
