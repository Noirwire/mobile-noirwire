import { FUNDING, userClearable } from "@noirwire/shared/application";
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
  /** Releases an action only the user can release, once they have checked the balance; null otherwise. */
  clear: (() => void) | null;
};

type Ended = { scope: string; what: string; how: "landed" | "expired" };

const NOTHING: PendingBlock = { blocked: false, note: null, clear: null };

/**
 * Whether a portfolio's last action (or, for `FUNDING`, the funding wallet's
 * last move of money) is reserved or still unsettled. While it is, every
 * Confirm for that scope is held back and `note` says why; the chain is
 * asked every few seconds, and once it settles the balances are read again
 * and the note says how it ended. The record decides, not this hook: it only
 * reads what the one shared pending-action store keeps in the encrypted
 * wallet, so every money screen sees the same reservation.
 */
export function usePendingBlock(scope: string | null): PendingBlock {
  const { pending, refresh } = useMoney();
  const key = useSyncExternalStore(pending.subscribePending, () => {
    const entry = scope ? pending.pendingFor(scope) : undefined;
    if (!entry || !scope) return null;
    const flags = `${pending.runningHere(scope) ? "here" : ""}|${userClearable(entry) ? "clearable" : ""}`;
    return `${entry.id}|${flags}|${entry.what}`;
  });
  const [id, here, clearable, ...words] = key ? key.split("|") : [];
  const what = words.join("|");
  const [ended, setEnded] = useState<Ended | null>(null);
  const [unresolved, setUnresolved] = useState<string | null>(null);

  useEffect(() => {
    if (!scope || !id || here) return;
    let current = true;
    const check = async () => {
      const state = await pending.settlePending(scope);
      if (!current) return;
      setUnresolved(state === "unknown" ? id : null);
      if (state !== "landed" && state !== "expired") return;
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

  if (!scope) return NOTHING;
  const subject = scope === FUNDING ? "funding" : "portfolio";
  if (id) {
    // This screen is doing it right now, and already says so.
    if (here) return { blocked: true, note: null, clear: null };
    const stuck = unresolved === id;
    return {
      blocked: true,
      note: pendingActionNote(subject, what, stuck ? "unresolved" : "waiting"),
      clear: stuck && clearable ? () => void pending.clearPending(scope, id) : null,
    };
  }
  if (ended?.scope !== scope) return NOTHING;
  return { blocked: false, note: pendingActionNote(subject, ended.what, ended.how), clear: null };
}
