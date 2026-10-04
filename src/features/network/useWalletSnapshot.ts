import type { Wallet } from "@noirwire/shared/domain";
import { getSnapshot, isUnlocked, subscribe } from "@noirwire/shared/wallet";
import { useSyncExternalStore } from "react";

/** The unlocked wallet as the store holds it, or null while locked or with none. */
export function useWalletSnapshot(): Wallet | null {
  return useSyncExternalStore(subscribe, getSnapshot) ?? null;
}

export function useIsUnlocked() {
  return useSyncExternalStore(subscribe, isUnlocked);
}
