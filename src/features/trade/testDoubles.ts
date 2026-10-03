import type { Attempt } from "@noirwire/shared/application";
import type { Holding, NetworkCost, PendingAction, PieSlice } from "@noirwire/shared/domain";
import { configureHttp, deriveKeypair } from "@noirwire/shared/infrastructure";
import {
  createPortfolio,
  createWallet,
  storeNewWallet,
  updateWallet,
} from "@noirwire/shared/wallet";
import { STRONG_PASSWORD } from "../testServices";
import type { Order, TradeService } from "./tradeService";

/** Safe-area metrics for screens rendered outside the app's provider. */
export const PHONE_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

/**
 * Test doubles for the markets, trade and pie screens. Nothing here signs or
 * sends: the relay is a stubbed fetch with fixed prices and history, and the
 * trade service is a fake that answers with the shared result shapes.
 */

export const FIXTURE_PRICES: Record<string, { usd: number; change24h: number }> = {
  NVDAx: { usd: 235.91, change24h: 2.21 },
  SPYx: { usd: 769.26, change24h: 0.51 },
  SPCXx: { usd: 157.09, change24h: 4.2 },
  QQQx: { usd: 748.58, change24h: -0.86 },
  TSLAx: { usd: 412.1, change24h: -1.4 },
  AAPLx: { usd: 255.2, change24h: 0 },
};

export const FIXTURE_HISTORY = [230.7, 231.2, 229.9, 233.4, 235.89];

type Relay = {
  prices?: Record<string, { usd: number; change24h: number }> | null;
  history?: number[] | null;
};

let clockOffset = 0;

/**
 * Points the shared clients at a stubbed relay. Each call moves the clock on
 * by ten minutes, so the shared price poll treats every test as a fresh start
 * and nothing one test read counts as live in the next.
 */
export function installFakeRelay(relay: Relay = {}) {
  const prices = relay.prices === undefined ? FIXTURE_PRICES : relay.prices;
  const history = relay.history === undefined ? FIXTURE_HISTORY : relay.history;
  clockOffset += 10 * 60 * 1000;
  const realNow = Date.now.bind(Date);
  const offset = clockOffset;
  jest.spyOn(Date, "now").mockImplementation(() => realNow() + offset);
  configureHttp({ baseUrl: "https://relay.test", headers: () => ({}) });
  const fetchMock = jest.fn(async (url: string) => {
    const body = url.endsWith("/api/prices")
      ? { prices }
      : url.includes("/api/history/")
        ? { points: history }
        : null;
    return {
      ok: body !== null,
      headers: { get: () => "0" },
      json: async () => body,
    };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

export type PortfolioSpec = {
  label: string;
  cash?: number;
  holdings?: Record<string, number>;
  pie?: PieSlice[];
  pendingAction?: PendingAction;
};

/** A stored, unlocked wallet with the portfolios given, in order. */
export async function walletWith(specs: PortfolioSpec[]) {
  const draft = createWallet();
  const mnemonic = draft.phrase.join(" ");
  const portfolios = specs.map((spec, index) => {
    const base =
      index === 0
        ? draft.wallet.portfolios[0]
        : createPortfolio(
            spec.label,
            deriveKeypair(mnemonic, index + 1).publicKey.toBase58(),
            index + 1,
          );
    const holdings: Holding[] = base.holdings.map((holding) =>
      holding.symbol === "USDC" ? { ...holding, amount: spec.cash ?? 0 } : holding,
    );
    for (const [symbol, amount] of Object.entries(spec.holdings ?? {})) {
      holdings.push({ symbol, amount, cost: 0 });
    }
    return {
      ...base,
      label: spec.label,
      holdings,
      ...(spec.pie ? { pie: spec.pie } : {}),
      ...(spec.pendingAction ? { pendingAction: spec.pendingAction } : {}),
    };
  });
  await storeNewWallet(
    { ...draft.wallet, portfolios: [draft.wallet.portfolios[0]] },
    draft.phrase,
    STRONG_PASSWORD,
  );
  await updateWallet((wallet) => ({ ...wallet, portfolios }));
  return portfolios.map((portfolio) => portfolio.id);
}

export function order(overrides: Partial<Order> = {}): Order {
  return {
    side: "buy",
    stock: { symbol: "NVDAx" },
    spend: 100,
    receive: 0.4239,
    receiveAtLeast: 0.4215,
    unitPrice: 235.91,
    venue: "Jupiter",
    priceChecked: true,
    quote: { expiresAt: Date.now() + 30_000, feeBps: 50, gasless: true },
    ...overrides,
  };
}

export const COVERED: NetworkCost = { kind: "covered" };
export const OPENS_HOLDING: NetworkCost = {
  kind: "relayer",
  fee: 0.21,
  feeRaw: 210_000n,
  opens: "holding",
  count: 1,
};

export const confirmed: Attempt<Order> = {
  kind: "confirmed",
  signature: "sig",
  settlement: "balancesRead",
};

/** A trade service that answers from fixtures. Override any part a test drives. */
export function fakeTradeService(overrides: Partial<TradeService> = {}): TradeService & {
  place: jest.Mock;
  quote: jest.Mock;
  openHoldings: jest.Mock;
} {
  const place = jest.fn(async (): Promise<Attempt<Order>> => confirmed);
  const quote = jest.fn(
    async (_id: string, side: "buy" | "sell", symbol: string, amount: number) => ({
      plan: order({
        side,
        stock: { symbol },
        spend: amount,
        receive: amount / 236,
        receiveAtLeast: amount / 237,
      }),
    }),
  );
  const openHoldings = jest.fn(async (): Promise<Attempt> => ({
    kind: "confirmed",
    settlement: "balancesRead",
  }));
  return {
    available: () => true,
    noirwireFeeBps: () => 50,
    smallestOrderUsd: () => 12,
    quote,
    reviewCost: async () => ({ lamports: 0, cost: COVERED }),
    isBuilt: () => true,
    place,
    openHoldings,
    refresh: async () => true,
    pending: {
      subscribe: () => () => undefined,
      runningHere: () => false,
      settle: async () => "pending",
      clear: async () => undefined,
    },
    ...overrides,
  } as TradeService & { place: jest.Mock; quote: jest.Mock; openHoldings: jest.Mock };
}
