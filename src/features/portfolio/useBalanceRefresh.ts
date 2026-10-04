import {
  NEVER_READ,
  recordRead,
  REFRESH_INTERVAL_MS,
  type ReadFreshness,
} from "@noirwire/shared/domain";
import { WAIT_LIMIT_MS } from "@noirwire/shared/presentation";
import { useCallback, useEffect, useRef, useState } from "react";
import { lightHaptic } from "@/ui/haptics";
import { withinLimit } from "@/ui/useWaiting";

type RefreshState = {
  /** A read is on its way. */
  reading: boolean;
  /** The read on its way was asked for by a pull. */
  pulled: boolean;
  /** When balances last came back whole, and whether the latest read did not. */
  freshness: ReadFreshness;
};

/**
 * Re-reads balances when a screen comes into view (on opening, on coming
 * back to it and when the app returns to the foreground), every refresh
 * interval while it stays there, when the phone comes back online, on a pull
 * down and on "Try again". While offline a pull does nothing: the offline
 * banner says why. A read that has not answered within the content limit
 * counts as failed, so the screen never waits on it for ever; it may still
 * answer later, and what it read is kept.
 */
export function useBalanceRefresh(read: () => Promise<boolean>, online: boolean, inView = true) {
  const [state, setState] = useState<RefreshState>({
    reading: false,
    pulled: false,
    freshness: NEVER_READ,
  });
  const mounted = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (pulled: boolean) => {
      if (busy.current) return;
      busy.current = true;
      setState((current) => ({ ...current, reading: true, pulled }));
      const ok = await withinLimit(read(), WAIT_LIMIT_MS.content).catch(() => false);
      busy.current = false;
      if (mounted.current) {
        setState((current) => ({
          reading: false,
          pulled: false,
          freshness: recordRead(current.freshness, ok, Date.now()),
        }));
      }
    },
    [read],
  );

  useEffect(() => {
    if (!online || !inView) return;
    void run(false);
    const timer = setInterval(() => void run(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [online, inView, run]);

  return {
    reading: state.reading,
    refreshing: state.reading && state.pulled,
    freshness: state.freshness,
    /** The last read did not come back whole; the values shown are the last ones read. */
    failed: state.freshness.lastAttemptFailed,
    /** At least one read has finished since the screen opened. */
    settled: state.freshness !== NEVER_READ,
    pull() {
      if (!online) return;
      lightHaptic();
      void run(true);
    },
    /** Asks again after a read that failed, without the pull's spinner. */
    retry() {
      if (online) void run(false);
    },
  };
}
