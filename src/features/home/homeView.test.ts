import type { Wallet } from "@noirwire/shared/domain";
import { forgetWallet, installTestPlatform } from "../testServices";
import {
  activity,
  holding,
  seedLivePrices,
  unlockedWallet,
  withHolding,
} from "../portfolio/testWallet";
import { homeView } from "./homeView";

let updatedAt: number;

beforeEach(async () => {
  installTestPlatform();
  updatedAt ??= await seedLivePrices();
});
afterEach(() => forgetWallet());

function named(wallet: Wallet, label: string): Wallet {
  return {
    ...wallet,
    portfolios: wallet.portfolios.map((p, i) => (i === 0 ? { ...p, label } : p)),
  };
}

describe("homeView", () => {
  it("leads an empty wallet with getting USDC in, and no day line", async () => {
    const wallet = await unlockedWallet((w) => named(w, "Investing"));
    const view = homeView(wallet, updatedAt);
    expect(view.empty).toBe(true);
    expect(view.total).toMatchObject({ value: "$0.00", unavailable: false });
    expect(view.total.change).toBeUndefined();
    expect(view.primary).toEqual({ label: "Add USDC", target: { to: "receive", reveal: false } });
    expect(view.secondary).toEqual({
      label: "Show funding address",
      target: { to: "receive", reveal: true },
    });
    expect(view.howTo.steps.map((step) => step.title)).toEqual([
      "1. Get USDC on Solana",
      "2. Send it to your funding address",
      "3. Move USDC into a portfolio privately",
    ]);
    expect(view.portfolios).toHaveLength(1);
    expect(view.portfolios[0]).toMatchObject({ name: "Investing", line: "No investments yet" });
  });

  it("adds up every active portfolio, with the day's move of held trackers", async () => {
    const wallet = await unlockedWallet((w) => {
      const [first] = w.portfolios;
      const investing = withHolding(
        withHolding({ ...first, label: "Investing" }, holding("USDC", 457.33)),
        holding("NVDAx", 5.1075, 400),
      );
      return { ...w, portfolios: [investing] };
    });
    const view = homeView(wallet, updatedAt);
    expect(view.empty).toBe(false);
    expect(view.total.value).toBe("$968.08");
    expect(view.total.change).toBe("+$10.22 (2.0%) held trackers · 24h indicative");
    expect(view.total.changeTone).toBe("safe");
    expect(view.cash).toEqual({ label: "Cash available to invest", value: "$457.33" });
    expect(view.primary.label).toBe("Find trackers");
    expect(view.secondary).toEqual({
      label: "Add money",
      target: { to: "receive", reveal: false },
    });
    expect(view.portfolios[0]).toMatchObject({
      line: "$457.33 cash · 1 holding",
      value: "$968.08",
    });
    expect(view.investments).toEqual([
      expect.objectContaining({
        name: "NVIDIA tracker",
        caption: "NVDAx · 5.1075 tokens",
        value: "$510.75",
      }),
    ]);
  });

  it("shows no number while prices are missing, and keeps the cash line", async () => {
    const wallet = await unlockedWallet((w) => {
      const [first] = w.portfolios;
      return {
        ...w,
        portfolios: [withHolding(withHolding(first, holding("USDC", 20)), holding("NVDAx", 1, 90))],
      };
    });
    const view = homeView(wallet, null);
    expect(view.total).toMatchObject({
      value: "Value unavailable",
      unavailable: true,
      change: "Waiting for current balances or market prices",
    });
    expect(view.cash.value).toBe("$20.00");
    expect(view.portfolios[0].value).toBe("Value unavailable");
    expect(view.portfolios[0].change).toBeNull();
    expect(view.investments[0].value).toBe("Price unavailable");
  });

  it("puts USDC waiting in the funding wallet first, with the one primary button", async () => {
    const wallet = await unlockedWallet((w) => ({
      ...named(w, "Investing"),
      funding: { ...w.funding, tokens: { ...w.funding.tokens, USDC: 250 } },
    }));
    const view = homeView(wallet, updatedAt);
    expect(view.empty).toBe(false);
    expect(view.waiting?.text).toBe(
      "250.00 USDC has arrived in your funding wallet. Move it to a portfolio before buying.",
    );
    expect(view.waiting?.action).toEqual({
      label: "Move money to Investing",
      target: { to: "fund", portfolioId: wallet.portfolios[0].id },
    });
    expect(view.actionsQuiet).toBe(true);
    expect(view.secondary.target).toEqual({ to: "fund" });
  });

  it("lists archived portfolios apart, and keeps them out of the total", async () => {
    const wallet = await unlockedWallet((w) => {
      const [first] = w.portfolios;
      const archived = {
        ...withHolding(first, holding("USDC", 10)),
        id: "archived",
        label: "Old",
        archivedAt: 1,
      };
      return { ...w, portfolios: [{ ...first, label: "Investing" }, archived] };
    });
    const view = homeView(wallet, updatedAt);
    expect(view.portfolios.map((row) => row.name)).toEqual(["Investing"]);
    expect(view.archived.heading).toBe("Archived portfolios (1)");
    expect(view.archived.rows.map((row) => row.name)).toEqual(["Old"]);
    expect(view.total.value).toBe("$0.00");
  });

  it("shows the three newest activity rows, and a pie's own line", async () => {
    const wallet = await unlockedWallet((w) => {
      const [first] = w.portfolios;
      const pie = {
        ...withHolding(first, holding("USDC", 96.18)),
        label: "Core",
        pie: [
          { symbol: "NVDAx", weight: 50 },
          { symbol: "SPYx", weight: 50 },
        ],
      };
      return {
        ...w,
        portfolios: [pie],
        activity: [1, 2, 3, 4].map((n) =>
          activity({ portfolioId: first.id, kind: "fund", at: n * 1000, usd: n }),
        ),
      };
    });
    const view = homeView(wallet, updatedAt);
    expect(view.portfolios[0].line).toBe("Pie · 2 trackers · $96.18 cash");
    expect(view.recent.map((row) => row.value.text)).toEqual(["+$4.00", "+$3.00", "+$2.00"]);
  });
});
