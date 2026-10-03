import type { Portfolio, Wallet } from "@noirwire/shared/domain";
import { forgetWallet, installTestPlatform } from "../testServices";
import { portfolioView, publicViewModel, type PortfolioDetailView } from "./portfolioView";
import { activity, holding, seedLivePrices, unlockedWallet, withHolding } from "./testWallet";

let updatedAt: number;

beforeEach(async () => {
  installTestPlatform();
  updatedAt ??= await seedLivePrices();
});
afterEach(() => forgetWallet());

async function walletWith(shape: (first: Portfolio) => Portfolio, extra: Partial<Wallet> = {}) {
  return unlockedWallet((w) => ({
    ...w,
    ...extra,
    portfolios: [shape({ ...w.portfolios[0], label: "Investing" })],
  }));
}

function found(wallet: Wallet, at: number | null = updatedAt): PortfolioDetailView {
  const view = portfolioView(wallet, wallet.portfolios[0].id, at);
  if (view.kind !== "found") throw new Error("expected a portfolio");
  return view;
}

describe("portfolioView", () => {
  it("says a stale route's portfolio does not exist", async () => {
    const wallet = await unlockedWallet();
    expect(portfolioView(wallet, "gone", updatedAt)).toEqual({
      kind: "missing",
      message: "That portfolio does not exist.",
      back: "Back to Home",
    });
  });

  it("leads an empty portfolio with moving money in, as the one primary", async () => {
    const view = found(await walletWith((p) => p));
    expect(view.kindLine).toMatch(/^Portfolio · Created \d{1,2} \w{3} \d{4}$/);
    expect(view.value).toBe("$0.00");
    expect(view.cashLine).toBe("0.00 USDC cash to invest");
    expect(view.primary).toBeNull();
    expect(view.empty).toEqual({
      title: "Nothing here yet.",
      button: { label: "Move money here", action: { to: "fund" } },
      caption: "Add money first, then choose a tracker.",
    });
    expect(view.quiet.map((button) => [button.label, !!button.disabled])).toEqual([
      ["Receive", false],
      ["Send", true],
    ]);
    expect(view.sendReason).toBe("Nothing to send yet.");
    expect(view.activity.empty).toBe(
      "Nothing has moved yet. Fund or receive into this portfolio to begin.",
    );
  });

  it("offers the first tracker once there is cash", async () => {
    const view = found(await walletWith((p) => withHolding(p, holding("USDC", 50))));
    expect(view.empty?.button).toEqual({
      label: "Add your first tracker",
      action: { to: "buy" },
    });
    expect(view.empty?.caption).toBeNull();
    expect(view.quiet.map((button) => button.label)).toEqual(["Receive", "Send", "Add money"]);
  });

  it("lists cash first, then trackers by value, then anything else without an action", async () => {
    const view = found(
      await walletWith((p) =>
        withHolding(
          withHolding(
            withHolding(withHolding(p, holding("USDC", 457.33)), holding("NVDAx", 1)),
            holding("SPYx", 1),
          ),
          holding("SOL", 0.5),
        ),
      ),
    );
    expect(view.primary).toEqual({ label: "Buy a tracker", action: { to: "buy" } });
    expect(view.holdings?.title).toBe("Holdings");
    expect(view.holdings?.rows.map((row) => [row.name, row.amount, row.value])).toEqual([
      ["Cash", "457.33 USDC", null],
      ["SP500 tracker", "1.0000 SPYx", "$500.00"],
      ["NVIDIA tracker", "1.0000 NVDAx", "$100.00"],
      ["Solana", "0.5000 SOL", null],
    ]);
    expect(view.holdings?.rows[3].sell).toBeNull();
    expect(view.holdings?.rows[1].sell).toEqual({
      label: "Sell SP500 tracker",
      disabled: false,
      reason: null,
    });
    expect(view.value).toBe("Value unavailable");
  });

  it("shows no value and no price while prices are missing, but keeps token amounts", async () => {
    const view = found(await walletWith((p) => withHolding(p, holding("NVDAx", 2))), null);
    expect(view.value).toBe("Value unavailable");
    expect(view.valueUnavailable).toBe(true);
    expect(view.holdings?.rows[0]).toMatchObject({
      amount: "2.0000 NVDAx",
      value: "Price unavailable",
    });
  });

  it("draws a pie's mix, says which slices drifted in words, and offers Rebalance", async () => {
    const view = found(
      await walletWith((p) => ({
        ...withHolding(
          withHolding(withHolding(p, holding("USDC", 10)), holding("NVDAx", 4)),
          holding("SPYx", 1),
        ),
        pie: [
          { symbol: "NVDAx", weight: 50 },
          { symbol: "SPYx", weight: 50 },
        ],
      })),
    );
    expect(view.kindLine).toMatch(/^Pie · Created/);
    expect(view.primary?.label).toBe("Invest");
    expect(view.rebalance).toEqual({ label: "Rebalance", action: { to: "rebalance" } });
    expect(view.mix?.centre).toEqual({ label: "Invested", value: "$900.00" });
    expect(view.mix?.slices.map((slice) => [slice.name, slice.line, slice.trailing])).toEqual([
      ["NVIDIA tracker", "Target 50% · Now 44.4% · under", "$400.00"],
      ["SP500 tracker", "Target 50% · Now 55.6% · over", "$500.00"],
    ]);
    expect(view.holdings?.title).toBe("Cash and other holdings");
    expect(view.holdings?.rows.map((row) => row.name)).toEqual(["Cash"]);
  });

  it("shows an uninvested pie's target as outlines", async () => {
    const view = found(
      await walletWith((p) => ({
        ...p,
        pie: [
          { symbol: "NVDAx", weight: 60 },
          { symbol: "SPYx", weight: 40 },
        ],
      })),
    );
    expect(view.mix?.centre).toEqual({ label: "Target", value: "2 trackers" });
    expect(view.mix?.current).toEqual([0, 0]);
    expect(view.mix?.slices.map((slice) => slice.trailing)).toEqual(["Not bought", "Not bought"]);
    expect(view.primary).toEqual({ label: "Move money here", action: { to: "fund" } });
    expect(view.rebalance).toBeNull();
  });

  it("replaces the actions of an archived portfolio, with no Sell", async () => {
    const view = found(
      await walletWith((p) => ({ ...withHolding(p, holding("NVDAx", 1)), archivedAt: 1 })),
    );
    expect(view.archived?.title).toBe("This portfolio is archived.");
    expect(view.primary).toBeNull();
    expect(view.quiet).toEqual([]);
    expect(view.holdings?.rows[0].sell).toBeNull();
  });

  it("pins the pending note under the value", async () => {
    const view = found(
      await walletWith((p) => ({
        ...p,
        pendingAction: { status: "submitted", id: "r1", at: 1, what: "a send of 5.00 USDC" },
      })),
    );
    expect(view.pending).toMatch(/^Your last action from this portfolio \(a send of 5\.00 USDC\)/);
  });

  it("builds public view from tickers, amounts and this phone's own entries only", async () => {
    const wallet = await walletWith((p) =>
      withHolding(withHolding(p, holding("USDC", 457.33)), holding("NVDAx", 5.1075)),
    );
    const [portfolio] = wallet.portfolios;
    const withEntries = {
      ...wallet,
      activity: [
        activity({
          portfolioId: portfolio.id,
          kind: "fund",
          amount: 100,
          at: Date.UTC(2026, 8, 3),
        }),
        activity({ portfolioId: "another", kind: "fund", amount: 7 }),
      ],
    };
    const model = publicViewModel(portfolio, withEntries);
    expect(model.address).toBe(portfolio.address);
    expect(model.holdings.map((entry) => entry.text)).toEqual(["457.33 USDC", "5.1075 NVDAx"]);
    expect(model.transactions).toEqual([
      expect.objectContaining({ kind: "Money arrived", amount: "100.00 USDC", date: "3 Sep 2026" }),
    ]);
    expect(JSON.stringify(model)).not.toContain("Investing");
  });
});
