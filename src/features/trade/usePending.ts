import { pendingActionNote } from "@noirwire/shared/presentation";
import { getSnapshot } from "@noirwire/shared/wallet";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTradeService } from "./tradeService";

/** How often the chain is asked about an action that is still unsettled. */
export const SETTLE_POLL_MS = 4_000;

export type PendingState = {
  /** Whether confirming anything for this portfolio is held back. */
  blocked: boolean;
  note: string | null;
};

/**
 * Whether a portfolio's last action is reserved or still unsettled. While it
 * is, every Confirm for that portfolio is held back and the note says why;
 * the chain is asked every few seconds, and once it has settled the note says
 * how it ended. The state is read from the encrypted wallet record, so it
 * survives a lock and the app closing.
 */
export function usePending(portfolioId: string | null): PendingState {
  const service = useTradeService();
  const entry = useSyncExternalStore(service.pending.subscribe, () => {
    if (!portfolioId) return null;
    const pending = getSnapshot()?.portfolios.find((p) => p.id === portfolioId)?.pendingAction;
    if (!pending) return null;
    return `${pending.id}|${pending.what}|${service.pending.runningHere(portfolioId) ? "here" : ""}`;
  });
  const [id, what, here] = entry ? entry.split("|") : [];
  const [unresolved, setUnresolved] = useState<string | null>(null);
  const [ended, setEnded] = useState<{
    id: string;
    what: string;
    how: "landed" | "expired";
  } | null>(null);

  useEffect(() => {
    if (!portfolioId || !id || here) return;
    let live = true;
    const check = async () => {
      const state = await service.pending.settle(portfolioId);
      if (!live) return;
      setUnresolved(state === "unknown" ? id : null);
      if (state !== "landed" && state !== "expired") return;
      setEnded({ id: portfolioId, what, how: state });
      void service.refresh(portfolioId);
    };
    void check();
    const timer = setInterval(() => void check(), SETTLE_POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [portfolioId, id, what, here, service]);

  if (id) {
    if (here) return { blocked: true, note: null };
    return {
      blocked: true,
      note: pendingActionNote("portfolio", what, unresolved === id ? "unresolved" : "waiting"),
    };
  }
  if (!ended || ended.id !== portfolioId) return { blocked: false, note: null };
  return { blocked: false, note: pendingActionNote("portfolio", ended.what, ended.how) };
}
