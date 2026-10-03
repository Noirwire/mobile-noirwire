import {
  livePricesUpdatedAt,
  livePricesVersion,
  subscribeLivePrices,
  watchLivePrices,
  type Visibility,
} from "@noirwire/shared/infrastructure";
import { getSnapshot, isUnlocked, subscribe } from "@noirwire/shared/wallet";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

/** The unlocked wallet as the shared store holds it, or null while locked. */
export function useWalletSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useIsUnlocked() {
  return useSyncExternalStore(subscribe, isUnlocked);
}

const appVisibility: Visibility = {
  hidden: () => AppState.currentState !== "active",
  subscribe: (onChange) => {
    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  },
};

/**
 * Keeps live prices polled while the calling screen is mounted and the app is
 * in view, and answers when they were last read: null means there is no live
 * price, so nothing priced may show a number.
 */
export function useLivePrices(): number | null {
  useEffect(() => watchLivePrices(appVisibility), []);
  useSyncExternalStore(subscribeLivePrices, livePricesVersion);
  return livePricesUpdatedAt();
}
