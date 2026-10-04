import {
  NEVER_READ,
  recordRead,
  REFRESH_INTERVAL_MS,
  type ReadFreshness,
} from "@noirwire/shared/domain";
import { WAIT_LIMIT_MS } from "@noirwire/shared/presentation";
import { useCallback, useEffect, useRef, useState } from "react";
import { lightHaptic } from "@/ui/haptics";
import { useMoney } from "../network/money";
import { withinLimit } from "@/ui/useWaiting";
import {
  balanceFreshness,
  recordBalanceRead,
  useBalanceFreshness,
} from "../network/balanceFreshness";

type RefreshState = {
  /** A read is on its way. */
  reading: boolean;
  /** The read on its way was asked for by a pull. */
  pulled: boolean;
  /** When this screen's own read last came back whole, and whether the latest did not. */
  own: ReadFreshness;
};

/**
 * Re-reads balances when a screen comes into view (on opening, on coming
 * back to it and when the app returns to the foreground), every refresh
 * interval while it stays there, when the phone comes back online, on a pull
 * down and on "Try again". While offline a pull does nothing: the offline
 * banner says why. A read that has not answered within the content limit
 * counts as failed, so the screen never waits on it for ever; it may still
 * answer later, and what it read is kept.
 *
 * `wholeWallet` says `read` covers every balance: its results are then the
 * freshness every money screen is told. A read of less (one portfolio) keeps
 * its own, starting from what the whole wallet's read already knows.
 */
export function useBalanceRefresh(
  read: () => Promise<boolean>,
  online: boolean,
  inView = true,
  wholeWallet = false,
) {
  const shared = useBalanceFreshness();
  const [state, setState] = useState<RefreshState>(() => ({
    reading: false,
    pulled: false,
    own: balanceFreshness(),
  }));
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
      if (wholeWallet) recordBalanceRead(ok);
      if (mounted.current) {
        setState((current) => ({
          reading: false,
          pulled: false,
          own: recordRead(current.own, ok, Date.now()),
        }));
      }
    },
    [read, wholeWallet],
  );
  const freshness = wholeWallet ? shared : state.own;

  useEffect(() => {
    if (!online || !inView) return;
    void run(false);
    const timer = setInterval(() => void run(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [online, inView, run]);

  return {
    reading: state.reading,
    refreshing: state.reading && state.pulled,
    freshness,
    /** The last read did not come back whole; the values shown are the last ones read. */
    failed: freshness.lastAttemptFailed,
    /** At least one read has finished since the wallet was unlocked. */
    settled: freshness !== NEVER_READ,
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

/** Asks again for every balance, from a screen that shows them and does not refresh them itself. */
export function useBalanceRetry(): () => void {
  const read = useMoney().refresh.everything;
  return useCallback(() => {
    void withinLimit(read(), WAIT_LIMIT_MS.content)
      .catch(() => false)
      .then(recordBalanceRead);
  }, [read]);
}
