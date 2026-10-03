import {
  isPlaintextCleanupFailing,
  isSaveFailing,
  isSaving,
  isUnlocked,
  subscribe,
  walletExists,
} from "@noirwire/shared/wallet";
import { useSyncExternalStore } from "react";

/** Whether a wallet is stored: undefined until the vault has answered. */
export function useWalletExists(): boolean | undefined {
  return useSyncExternalStore(subscribe, walletExists);
}

export function useUnlocked(): boolean {
  return useSyncExternalStore(subscribe, isUnlocked);
}

/** What the store says about keeping changes: being written, refused, or an old plain text copy left behind. */
export function useStorageHealth() {
  const saving = useSyncExternalStore(subscribe, isSaving);
  const saveFailing = useSyncExternalStore(subscribe, isSaveFailing);
  const cleanupFailing = useSyncExternalStore(subscribe, isPlaintextCleanupFailing);
  return { saving, saveFailing, cleanupFailing };
}
