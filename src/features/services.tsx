import { refresh as refreshNetInfo, useNetInfo } from "@react-native-community/netinfo";
import * as Clipboard from "expo-clipboard";
import type { DerivationScheme } from "@noirwire/shared/domain";
import {
  lookFurtherForPortfolios,
  resolveImportedWallet,
  type ImportResolution,
  type SchemeActivity,
} from "@noirwire/shared/infrastructure";
import { createContext, useContext, useEffect, type ReactNode } from "react";
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
  /** A second, longer scan for a phrase's portfolios, carrying on from where the first stopped. */
  lookFurther(
    mnemonic: string,
    scheme: DerivationScheme,
    activity: SchemeActivity,
  ): Promise<SchemeActivity>;
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

/** How often the connection is asked about again while the phone reads as offline. */
export const OFFLINE_RECHECK_MS = 3_000;

/**
 * Whether the phone has a connection. The system does not always say when
 * one comes back, so while it reads as offline the state is asked for again
 * every few seconds: the offline banner clears by itself on reconnecting.
 */
function useDeviceOnline(): boolean {
  const online = useNetInfo().isConnected !== false;
  useEffect(() => {
    if (online) return;
    const timer = setInterval(
      () => void refreshNetInfo().catch(() => undefined),
      OFFLINE_RECHECK_MS,
    );
    return () => clearInterval(timer);
  }, [online]);
  return online;
}

export function deviceServices({ preferences, biometrics }: Installed): AppServices {
  return {
    biometric: biometricUnlock({ keystore: biometrics, preferences, access: sharedVaultKeyAccess }),
    preferences,
    resolveImport: resolveImportedWallet,
    lookFurther: lookFurtherForPortfolios,
    readClipboard: () => Clipboard.getStringAsync(),
    useOnline: useDeviceOnline,
  };
}
