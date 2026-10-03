import type { Activity, Holding, Portfolio, Wallet } from "@noirwire/shared/domain";
import {
  configureHttp,
  livePricesUpdatedAt,
  watchLivePrices,
  type LivePrice,
} from "@noirwire/shared/infrastructure";
import { createWallet, getSnapshot, storeNewWallet, updateWallet } from "@noirwire/shared/wallet";
import { act } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { AppServices } from "../services";
import { STRONG_PASSWORD, renderWith } from "../testServices";
import type { BalanceReads } from "./balanceReads";

/** The live prices a test file reads from; a stock's multiplier is 1 on the test network. */
export const TEST_PRICES: Record<string, LivePrice> = {
  NVDAx: { usd: 100, change24h: 2 },
  SPYx: { usd: 500, change24h: -1 },
  TSLAx: { usd: 200, change24h: 0 },
};

/**
 * Has the shared live-price feed read `TEST_PRICES` once, through a stand-in
 * for the relay, and answers when they were read. Prices stay fresh for the
 * rest of the test file. The platform must be installed first.
 */
export async function seedLivePrices(): Promise<number> {
  configureHttp({ baseUrl: "https://relay.test", headers: () => ({}) });
  const fetched = jest.fn(async () => ({
    ok: true,
    headers: { get: () => "0" },
    json: async () => ({ prices: TEST_PRICES }),
  }));
  global.fetch = fetched as unknown as typeof fetch;
  const stop = watchLivePrices({ hidden: () => false, subscribe: () => () => undefined });
  await act(async () => {
    for (let tries = 0; tries < 20 && livePricesUpdatedAt() === null; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
  stop();
  const updatedAt = livePricesUpdatedAt();
  if (updatedAt === null) throw new Error("The test prices were not read.");
  return updatedAt;
}

export function holding(symbol: string, amount: number, cost = 0): Holding {
  return { symbol, amount, cost };
}

/** Sets one holding of a portfolio, adding it when absent. */
export function withHolding(portfolio: Portfolio, entry: Holding): Portfolio {
  const others = portfolio.holdings.filter((item) => item.symbol !== entry.symbol);
  return { ...portfolio, holdings: [...others, entry] };
}

let nextId = 0;

export function activity(
  entry: Partial<Activity> & Pick<Activity, "portfolioId" | "kind">,
): Activity {
  nextId += 1;
  return {
    id: `act-${nextId}`,
    at: Date.now(),
    symbol: "USDC",
    amount: 100,
    usd: 100,
    ...entry,
  };
}

/** A new wallet, stored and unlocked, then changed by `shape` before any screen reads it. */
export async function unlockedWallet(shape: (wallet: Wallet) => Wallet = (wallet) => wallet) {
  const draft = createWallet();
  await storeNewWallet(draft.wallet, draft.phrase, STRONG_PASSWORD);
  await updateWallet(shape);
  return getSnapshot()!;
}

/** Balance reads that answer at once, with `ok`, and count how often they were asked. */
export function fakeBalances(ok = true): BalanceReads & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    everything: async () => {
      calls.push("everything");
      return ok;
    },
    portfolio: async (id) => {
      calls.push(`portfolio:${id}`);
      return ok;
    },
  };
}

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

/** Renders a screen as the app does: with its services and a phone's safe area. */
export function renderScreen(services: AppServices, ui: ReactElement) {
  return renderWith(services, <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}
