import {
  openHoldings,
  placeTrade,
  quoteTrade,
  reviewOrdersCost,
  type Attempt,
  type CostAgreed,
} from "@noirwire/shared/application";
import type { NetworkCost, Side } from "@noirwire/shared/domain";
import {
  lamportsNeededForTrades,
  noirwireFeeBps,
  type TradePlan,
} from "@noirwire/shared/infrastructure";
import { failureMessage, refusalMessage } from "@noirwire/shared/presentation";
import { PublicKey } from "@solana/web3.js";
import { useMemo } from "react";
import { phoneCost } from "../network/cost";
import { useMoney, type Money } from "../network/money";

/**
 * The shared trade use cases over the app's one money wiring, as the trade
 * and pie sheets call them. Nothing here decides anything: every order is
 * reserved, signed and settled by the shared code, in the one pending-action
 * store every other money screen uses.
 */
export function trading(money: Money) {
  const deps = { ...money.deps, chain: money.tradeChain, refresh: money.refresh };
  return {
    available: () => money.tradeChain.available(),
    /** About the smallest order the venue places, in dollars. */
    smallestOrderUsd: () => money.tradeChain.gaslessFromUsd,
    noirwireFeeBps,
    isBuilt: (plan: TradePlan) => money.tradeChain.isBuilt(plan),
    async quote(
      portfolioId: string,
      side: Side,
      symbol: string,
      amount: number,
    ): Promise<{ plan: TradePlan } | { error: string }> {
      const result = await quoteTrade(deps, { portfolioId, side, symbol, amount });
      if (result.kind === "quoted") return { plan: result.plan };
      return {
        error:
          result.kind === "refused"
            ? refusalMessage(result, "mobile")
            : failureMessage(result, "mobile"),
      };
    },
    /** How the network cost of these orders is met. Rejects when it could not be worked out. */
    async reviewCost(
      portfolioId: string,
      plans: TradePlan[],
      withoutRelayer: boolean,
    ): Promise<{ lamports: number; cost: NetworkCost }> {
      const portfolio = money.deps.store
        .snapshot()
        ?.portfolios.find((entry) => entry.id === portfolioId);
      if (!portfolio) return { lamports: 0, cost: { kind: "unavailable" } };
      const lamports = await lamportsNeededForTrades(plans, new PublicKey(portfolio.address));
      const cost = await reviewOrdersCost(deps, {
        portfolioId,
        plans,
        lamportsNeeded: lamports,
        withoutRelayer,
      });
      return { lamports, cost: phoneCost(cost) };
    },
    place: (
      portfolioId: string,
      plan: TradePlan,
      network: CostAgreed,
    ): Promise<Attempt<TradePlan>> => placeTrade(deps, { portfolioId, reviewed: plan, network }),
    openHoldings: (portfolioId: string, symbols: string[], reviewedFeeRaw: bigint) =>
      openHoldings(
        { ...money.deps, chain: money.holdingsChain, refresh: money.refresh },
        { portfolioId, symbols, reviewedFeeRaw },
      ),
    /** Re-reads one portfolio's balances; true when every read succeeded. */
    refresh: async (portfolioId: string) =>
      (await money.refresh.portfolioBalances(portfolioId)) !== undefined,
  };
}

export function useTrading() {
  const money = useMoney();
  return useMemo(() => trading(money), [money]);
}
