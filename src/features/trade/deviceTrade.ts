import {
  createBalanceRefresh,
  createPendingActions,
  openHoldings,
  placeTrade,
  quoteTrade,
  reviewOrdersCost,
  type ActionDeps,
  type CostChain,
  type HoldingsChain,
  type TradeChain,
  type Track,
} from "@noirwire/shared/application";
import { failureReason } from "@noirwire/shared/domain";
import {
  QUOTE_TOKEN,
  ataFor,
  assetHandle,
  connection,
  executeTrade,
  gaslessFromUsd,
  getCashBalances,
  getPortfolioBalances,
  getTokenBalance,
  isBuilt,
  lamportsNeededForTrades,
  noirwireFeeBps,
  planTrade,
  quoteRelayed,
  recordSignedWith,
  relayedOpenDraft,
  runRelayed,
  settle,
  shortfallFor,
  shuffled,
  stockBySymbol,
  tradingAvailable,
  type TokenDefinition,
  type TradePlan,
} from "@noirwire/shared/infrastructure";
import { getPlatform } from "@noirwire/shared/platform";
import { failureMessage, pendingWords, refusalMessage } from "@noirwire/shared/presentation";
import {
  catalog,
  getSnapshot,
  isUnlocked,
  serialised,
  subscribe,
  syncFromStorage,
  unlockedSession,
  updateWallet,
} from "@noirwire/shared/wallet";
import { PublicKey, type Keypair } from "@solana/web3.js";
import type { Order, TradeService } from "./tradeService";

/**
 * The shared trade use cases wired to this phone: the wallet store, the
 * unlocked session's keys, the Solana clients through the relay, the
 * relayer and analytics. Nothing here decides anything; it only says which
 * client answers each question a use case asks. Built once, on first use.
 */

const address = (value: string) => new PublicKey(value);

const track: Track = (name, data) =>
  (getPlatform().track as unknown as (event: string, props?: object) => void)(name, data);

const store = { snapshot: getSnapshot, update: updateWallet, isUnlocked, serialised };

/** This phone runs one process: a reservation nobody here is running was left by an app that has since closed. */
const pending = createPendingActions({
  store: { ...store, sync: syncFromStorage, subscribe },
  locks: {
    hold: async () => () => undefined,
    ownerGone: async () => true,
  },
  settle,
  prices: catalog,
});

const deps: ActionDeps<Keypair> = {
  session: unlockedSession,
  store,
  prices: catalog,
  track,
  failureBand: (result) => failureReason(failureMessage(result)),
  pending: { reserve: pending.reserve },
  words: pendingWords(catalog.shownUnits),
};

async function balanceOf(owner: string, symbol: string): Promise<number> {
  const handle = assetHandle(symbol);
  if (!handle) throw new Error(`Unknown asset ${symbol}`);
  return handle.getBalance(address(owner));
}

const refresh = createBalanceRefresh({
  store,
  chain: {
    balanceOf,
    portfolioBalances: (owner) => getPortfolioBalances(address(owner)),
    cashBalances: (owner) => getCashBalances(address(owner)),
  },
  prices: catalog,
  track,
  shuffle: shuffled,
});

const cost: CostChain = {
  balance: (owner) => connection.getBalance(address(owner)),
  shortfall: shortfallFor,
};

async function openHolding(input: {
  owner: Keypair;
  stock: TokenDefinition;
  reviewedFeeRaw: bigint;
  keepOut: string[];
  stillUnlocked: () => boolean;
}): Promise<string | null> {
  const { owner, stock } = input;
  const holding = ataFor(stock.mint, owner.publicKey, stock.programId);
  if (await connection.getAccountInfo(holding)) return null;
  return runRelayed({
    owner,
    reviewedFeeRaw: input.reviewedFeeRaw,
    keepOut: input.keepOut.map(address),
    stillUnlocked: input.stillUnlocked,
    build: (terms) => relayedOpenDraft({ ...stock, owner: owner.publicKey }, terms),
  });
}

const tradeChain: TradeChain<Keypair, TradePlan> = {
  available: tradingAvailable,
  isStock: (symbol) => Boolean(stockBySymbol(symbol)),
  plan: planTrade,
  isBuilt: (plan) => isBuilt(plan.quote),
  execute: executeTrade,
  get gaslessFromUsd() {
    return gaslessFromUsd();
  },
  cashSymbol: QUOTE_TOKEN.symbol,
  holdingOpen: async (owner, stock) =>
    Boolean(await connection.getAccountInfo(ataFor(stock.mint, address(owner), stock.programId))),
  quoteOpenHolding: (owner, stock) =>
    quoteRelayed(address(owner), (terms) =>
      relayedOpenDraft({ ...stock, owner: address(owner) }, terms),
    ),
  openHolding,
  tradeBalances: (owner, stock) =>
    Promise.all([
      getTokenBalance(stock.mint, stock.decimals, address(owner), stock.programId),
      getTokenBalance(
        QUOTE_TOKEN.mint,
        QUOTE_TOKEN.decimals,
        address(owner),
        QUOTE_TOKEN.programId,
      ),
    ]),
  balanceOf,
  cost,
};

const holdingsChain: HoldingsChain<Keypair, TokenDefinition> = {
  stock: stockBySymbol,
  openHolding,
};

const trading = { ...deps, chain: tradeChain, refresh };

/** The device only ever reviews plans it priced itself, so an Order handed back is a TradePlan. */
const asPlan = (order: Order) => order as unknown as TradePlan;
const asPlans = (orders: Order[]) => orders as unknown as TradePlan[];

let service: TradeService | null = null;

export function deviceTradeService(): TradeService {
  if (service) return service;
  recordSignedWith((record) =>
    pending.recordSigned({ ...record, signer: record.signer.toBase58() }),
  );
  service = {
    available: tradingAvailable,
    noirwireFeeBps,
    smallestOrderUsd: gaslessFromUsd,
    async quote(portfolioId, side, symbol, amount) {
      const result = await quoteTrade(trading, { portfolioId, side, symbol, amount });
      if (result.kind === "quoted") return { plan: result.plan };
      return { error: failureMessageOf(result) };
    },
    async reviewCost(portfolioId, plans, withoutRelayer) {
      const portfolio = getSnapshot()?.portfolios.find((entry) => entry.id === portfolioId);
      if (!portfolio) return { lamports: 0, cost: { kind: "unavailable" } };
      const lamports = await lamportsNeededForTrades(asPlans(plans), address(portfolio.address));
      const reviewed = await reviewOrdersCost(trading, {
        portfolioId,
        plans: asPlans(plans),
        lamportsNeeded: lamports,
        withoutRelayer,
      });
      return { lamports, cost: reviewed };
    },
    isBuilt: (plan) => isBuilt(asPlan(plan).quote),
    place: (portfolioId, plan, network) =>
      placeTrade(trading, { portfolioId, reviewed: asPlan(plan), network }) as never,
    openHoldings: (portfolioId, symbols, reviewedFeeRaw) =>
      openHoldings(
        { ...deps, chain: holdingsChain, refresh },
        { portfolioId, symbols, reviewedFeeRaw },
      ),
    refresh: async (portfolioId) => (await refresh.portfolioBalances(portfolioId)) !== undefined,
    pending: {
      subscribe: pending.subscribePending,
      runningHere: pending.runningHere,
      settle: pending.settlePending,
      clear: pending.clearPending,
    },
  };
  return service;
}

function failureMessageOf(
  result: Exclude<Awaited<ReturnType<typeof quoteTrade>>, { kind: "quoted" }>,
) {
  return result.kind === "failed" ? failureMessage(result) : refusalMessage(result);
}
