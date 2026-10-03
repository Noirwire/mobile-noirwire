import { useCallback, useEffect, useRef, useState } from "react";
import { lightHaptic } from "@/ui/haptics";

type RefreshState = {
  /** A read is on its way. */
  reading: boolean;
  /** The read on its way was asked for by a pull. */
  pulled: boolean;
  /** The last read did not come back whole; the values shown are the last ones read. */
  failed: boolean;
  /** At least one read has finished since the screen opened. */
  settled: boolean;
};

/**
 * Re-reads balances when a screen opens, when the phone comes back online,
 * and on a pull down. While offline a pull does nothing: the offline banner
 * says why.
 */
export function useBalanceRefresh(read: () => Promise<boolean>, online: boolean) {
  const [state, setState] = useState<RefreshState>({
    reading: false,
    pulled: false,
    failed: false,
    settled: false,
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
      const ok = await read().catch(() => false);
      busy.current = false;
      if (mounted.current) {
        setState({ reading: false, pulled: false, failed: !ok, settled: true });
      }
    },
    [read],
  );

  useEffect(() => {
    if (online) void run(false);
  }, [online, run]);

  return {
    reading: state.reading,
    refreshing: state.reading && state.pulled,
    failed: state.failed,
    settled: state.settled,
    pull() {
      if (!online) return;
      lightHaptic();
      void run(true);
    },
  };
}
