import { FUNDING } from "@noirwire/shared/application";
import { pendingActionNote } from "@noirwire/shared/presentation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMoney } from "./money";

/** How often the chain is asked about an action that is still unsettled (spec 3.3). */
export const SETTLE_POLL_MS = 4_000;

export type PendingBlock = {
  /** Whether confirming anything for this scope is held back. */
  blocked: boolean;
  /** What to say about it, if anything. */
  note: string | null;
};

type Ended = { scope: string; what: string; how: "landed" | "expired" };

/**
 * Whether a portfolio's last action (or, for `FUNDING`, the funding wallet's
 * last move of money) is reserved or still unsettled. While it is, every
 * Confirm for that scope is held back and `note` says why; the chain is
 * asked every few seconds, and once it settles the balances are read again
 * and the note says how it ended. The record decides, not this hook: it only
 * reads what the shared pending actions keep in the encrypted wallet.
 */
export function usePendingBlock(scope: string): PendingBlock {
  const { pending, refresh } = useMoney();
  const key = useSyncExternalStore(pending.subscribePending, () => {
    const entry = pending.pendingFor(scope);
    return entry ? `${entry.id}|${pending.runningHere(scope) ? "here" : ""}|${entry.what}` : null;
  });
  const [id, here, ...words] = key ? key.split("|") : [];
  const what = words.join("|");
  const [ended, setEnded] = useState<Ended | null>(null);

  useEffect(() => {
    if (!id || here) return;
    let current = true;
    const check = async () => {
      const state = await pending.settlePending(scope);
      if (!current || (state !== "landed" && state !== "expired")) return;
      setEnded({ scope, what, how: state });
      if (scope === FUNDING) void refresh.fundingBalances();
      else void refresh.portfolioBalances(scope);
    };
    void check();
    const timer = setInterval(() => void check(), SETTLE_POLL_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [pending, refresh, scope, id, here, what]);

  const subject = scope === FUNDING ? "funding" : "portfolio";
  if (id) {
    // This screen is doing it right now, and already says so.
    if (here) return { blocked: true, note: null };
    return { blocked: true, note: pendingActionNote(subject, what, "waiting") };
  }
  if (ended?.scope !== scope) return { blocked: false, note: null };
  return { blocked: false, note: pendingActionNote(subject, ended.what, ended.how) };
}
