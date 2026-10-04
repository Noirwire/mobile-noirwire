import { WAIT_LIMIT_MS } from "@noirwire/shared/presentation";
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
import { withinLimit } from "@/ui/useWaiting";

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

/** A price history as far as it has been read, with the moment a series arrived: its last point is from then. */
export type ReadHistory =
  | { status: "loading" }
  | { status: "ready"; points: number[]; readAt: number }
  | { status: "none" };

/** A tracker's real price history for one range. Nothing is drawn from anything else. */
export function usePriceHistory(symbol: string, range: PriceRange, enabled = true): ReadHistory {
  const key = `${symbol}:${range}`;
  const [answer, setAnswer] = useState<{ key: string; history: ReadHistory } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    // A history that does not come within the limit counts as none: the chart
    // says so instead of loading for ever.
    void withinLimit(priceHistory(symbol, range), WAIT_LIMIT_MS.content)
      .catch(() => null)
      .then((points) => {
        if (current)
          setAnswer({
            key,
            history: points ? { status: "ready", points, readAt: Date.now() } : { status: "none" },
          });
      });
    return () => {
      current = false;
    };
  }, [symbol, range, key, enabled]);
  return answer?.key === key ? answer.history : { status: "loading" };
}
