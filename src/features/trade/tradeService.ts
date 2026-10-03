import type { Attempt, CostAgreed } from "@noirwire/shared/application";
import type { NetworkCost, PricedOrder, Side } from "@noirwire/shared/domain";
import { createContext, useContext } from "react";

/** A priced order as the review shows it, with the tracker it is for. */
export type Order = PricedOrder & { stock: { symbol: string } };

/** What became of asking the chain about a portfolio's unsettled action. */
export type SettleState = "none" | "pending" | "landed" | "expired" | "unknown";

/**
 * What the trade and pie sheets ask of the outside world: the venue, the
 * relayer, the chain and the pending-action store. The device wires the
 * shared use cases in (deviceTrade.ts); a test hands in a fake, so nothing is
 * ever signed or sent from a test.
 */
export type TradeService = {
  /** Whether live trading is possible on this network at all. */
  available(): boolean;
  /** NoirWire's own share of a trade's fee, in basis points. */
  noirwireFeeBps(): number;
  /** About the smallest order the venue places, in dollars. */
  smallestOrderUsd(): number;
  quote(
    portfolioId: string,
    side: Side,
    symbol: string,
    amount: number,
  ): Promise<{ plan: Order } | { error: string }>;
  /** How the network cost of these orders is met. Rejects when it could not be worked out. */
  reviewCost(
    portfolioId: string,
    plans: Order[],
    withoutRelayer: boolean,
  ): Promise<{ lamports: number; cost: NetworkCost }>;
  /** Whether the venue built a firm order behind the price. */
  isBuilt(plan: Order): boolean;
  place(portfolioId: string, plan: Order, network: CostAgreed): Promise<Attempt<Order>>;
  openHoldings(portfolioId: string, symbols: string[], reviewedFeeRaw: bigint): Promise<Attempt>;
  /** Re-reads one portfolio's balances; true when every read succeeded. */
  refresh(portfolioId: string): Promise<boolean>;
  pending: {
    subscribe(listener: () => void): () => void;
    runningHere(portfolioId: string): boolean;
    settle(portfolioId: string): Promise<SettleState>;
    clear(portfolioId: string, entryId: string): Promise<void>;
  };
};

const TradeServiceContext = createContext<TradeService | null>(null);

export const TradeServiceProvider = TradeServiceContext.Provider;

/** The service a test provided, or the device's own, wired on first use. */
export function useTradeService(): TradeService {
  const provided = useContext(TradeServiceContext);
  if (provided) return provided;
  // Loaded on first use so a screen that never trades never pulls in the chain clients.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("./deviceTrade") as typeof import("./deviceTrade")).deviceTradeService();
}
