import type { Wallet } from "@noirwire/shared/domain";
import { getSnapshot, subscribe } from "@noirwire/shared/wallet";
import { useSyncExternalStore } from "react";

/** The unlocked wallet as the store holds it, or null while locked. */
export function useWalletSnapshot(): Wallet | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
