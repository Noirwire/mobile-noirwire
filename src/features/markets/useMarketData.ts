import {
  NEVER_READ,
  recordRead,
  type PriceRange,
  type ReadFreshness,
} from "@noirwire/shared/domain";
import {
  livePricesFreshness,
  livePricesUpdatedAt,
  livePricesVersion,
  priceHistory,
  subscribeLivePrices,
  watchLivePrices,
  type Visibility,
} from "@noirwire/shared/infrastructure";
import { WAIT_LIMIT_MS } from "@noirwire/shared/presentation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useWaiting, withinLimit } from "@/ui/useWaiting";

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
 * view, and re-renders on every poll, failed ones too. `updatedAt` is when
 * prices were last read, or null while there is no fresh price at all;
 * `freshness` is what the screen's "may be out of date" notice is decided
 * from. A first read that has not answered within the content limit counts
 * as failed, so no screen waits on it for ever.
 */
export function useLivePrices(): { updatedAt: number | null; freshness: ReadFreshness } {
  useEffect(() => watchLivePrices(appVisibility), []);
  useSyncExternalStore(subscribePrices, livePricesVersion);
  const freshness = livePricesFreshness();
  const unanswered = freshness.succeededAt === null && !freshness.lastAttemptFailed;
  const { overdue } = useWaiting(unanswered, "content");
  return {
    updatedAt: livePricesUpdatedAt(),
    freshness: overdue ? recordRead(freshness, false, 0) : freshness,
  };
}

/** A price history as far as it has been read, with the moment a series arrived: its last point is from then. */
export type ReadHistory =
  | { status: "loading" }
  | { status: "ready"; points: number[]; readAt: number }
  | { status: "none" };

type Answer = { key: string; history: ReadHistory; freshness: ReadFreshness };

/**
 * A tracker's real price history for one range. Nothing is drawn from
 * anything else. A range is read once; one that did not come is asked for
 * again each time `clock` moves, and its freshness says the read failed.
 */
export function usePriceHistory(
  symbol: string,
  range: PriceRange,
  enabled = true,
  clock = 0,
): { history: ReadHistory; freshness: ReadFreshness } {
  const key = `${symbol}:${range}`;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const arrived = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || arrived.current === key) return;
    let current = true;
    // A history that does not come within the limit counts as none: the chart
    // says so instead of loading for ever.
    void withinLimit(priceHistory(symbol, range), WAIT_LIMIT_MS.content)
      .catch(() => null)
      .then((points) => {
        if (!current) return;
        const readAt = Date.now();
        if (points) arrived.current = key;
        setAnswer((previous) => ({
          key,
          history: points ? { status: "ready", points, readAt } : { status: "none" },
          freshness: recordRead(
            previous?.key === key ? previous.freshness : NEVER_READ,
            points !== null,
            readAt,
          ),
        }));
      });
    return () => {
      current = false;
    };
  }, [symbol, range, key, enabled, clock]);
  return answer?.key === key
    ? { history: answer.history, freshness: answer.freshness }
    : { history: { status: "loading" }, freshness: NEVER_READ };
}
