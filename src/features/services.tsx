import { useNetInfo } from "@react-native-community/netinfo";
import * as Clipboard from "expo-clipboard";
import { resolveImportedWallet, type ImportResolution } from "@noirwire/shared/infrastructure";
import { createContext, useContext, type ReactNode } from "react";
import type { Installed } from "@/platform/install";
import type { Preferences } from "@/platform/preferences";
import { biometricUnlock, type BiometricUnlock } from "./biometric/biometricUnlock";
import { sharedVaultKeyAccess } from "./biometric/vaultKeyAccess";

/**
 * What screens reach outside the shared wallet store for, so a test can hand
 * a screen in-memory stand-ins. The wallet store itself is the shared one in
 * both, over an in-memory vault in tests.
 */
export type AppServices = {
  biometric: BiometricUnlock;
  preferences: Preferences;
  resolveImport(mnemonic: string): Promise<ImportResolution>;
  /** Reads the clipboard once, on an explicit Paste. */
  readClipboard(): Promise<string>;
  useOnline(): boolean;
};

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("useServices() outside ServicesProvider.");
  return services;
}

function useDeviceOnline(): boolean {
  return useNetInfo().isConnected !== false;
}

export function deviceServices({ preferences, biometrics }: Installed): AppServices {
  return {
    biometric: biometricUnlock({ keystore: biometrics, preferences, access: sharedVaultKeyAccess }),
    preferences,
    resolveImport: resolveImportedWallet,
    readClipboard: () => Clipboard.getStringAsync(),
    useOnline: useDeviceOnline,
  };
}
