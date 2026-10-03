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
import type { Money } from "../network/money";
import { fakeChain, renderWithMoney, testMoney } from "../network/testMoney";
import type { AppServices } from "../services";
import { STRONG_PASSWORD } from "../testServices";

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

/**
 * The money wiring with balance reads that answer at once, with `ok`, and
 * count how often they were asked. Nothing else about it reaches a network.
 */
export function fakeBalances(ok = true): { money: Money; calls: string[] } {
  const calls: string[] = [];
  const money = testMoney(fakeChain());
  return {
    calls,
    money: {
      ...money,
      refresh: {
        ...money.refresh,
        everything: async () => {
          calls.push("everything");
          return ok;
        },
        portfolioBalances: async (id) => {
          calls.push(`portfolio:${id}`);
          return ok ? getSnapshot()?.portfolios.find((entry) => entry.id === id) : undefined;
        },
      },
    },
  };
}

/** Renders a screen as the app does: with its services, the money wiring and a phone's safe area. */
export function renderScreen(
  services: AppServices,
  ui: ReactElement,
  balances: { money: Money } = fakeBalances(),
) {
  return renderWithMoney(services, balances.money, ui);
}
