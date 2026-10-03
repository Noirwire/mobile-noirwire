import {
  livePricesUpdatedAt,
  livePricesVersion,
  priceHistory,
  subscribeLivePrices,
  watchLivePrices,
  type Visibility,
} from "@noirwire/shared/infrastructure";
import type { PriceRange, Wallet } from "@noirwire/shared/domain";
import { getSnapshot, subscribe } from "@noirwire/shared/wallet";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";

/** The phone is out of view while the app is in the background; prices are not polled then. */
const appVisibility: Visibility = {
  hidden: () => AppState.currentState === "background",
  subscribe(onChange) {
    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  },
};

const subscribePrices = (listener: () => void) => {
  const stop = subscribeLivePrices(listener);
  return () => void stop();
};

/**
 * Keeps live prices polled while the screen is mounted and the app is in
 * view, and re-renders on every poll. Answers when prices were last read, or
 * null while there is no fresh price at all.
 */
export function useLivePrices(): number | null {
  useEffect(() => watchLivePrices(appVisibility), []);
  useSyncExternalStore(subscribePrices, livePricesVersion);
  return livePricesUpdatedAt();
}

/** The unlocked wallet, or null while locked or with none. */
export function useWalletSnapshot(): Wallet | null {
  return useSyncExternalStore(subscribe, getSnapshot) ?? null;
}

export type History =
  { status: "loading" } | { status: "ready"; points: number[] } | { status: "none" };

/** A tracker's real price history for one range. Nothing is drawn from anything else. */
export function usePriceHistory(symbol: string, range: PriceRange, enabled = true): History {
  const key = `${symbol}:${range}`;
  const [answer, setAnswer] = useState<{ key: string; history: History } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void priceHistory(symbol, range).then((points) => {
      if (current)
        setAnswer({ key, history: points ? { status: "ready", points } : { status: "none" } });
    });
    return () => {
      current = false;
    };
  }, [symbol, range, key, enabled]);
  return answer?.key === key ? answer.history : { status: "loading" };
}
