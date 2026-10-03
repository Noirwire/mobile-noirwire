import type { Wallet } from "@noirwire/shared/domain";
import { activity, unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform } from "../testServices";
import { activityDetailView, activityListView, activityRow, dayHeading } from "./activityView";
import { dateAndTime, shortDate } from "./dates";

afterEach(() => forgetWallet());

const NOW = new Date(2026, 8, 30, 12, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

async function walletWithEntries(entries: (id: string) => Wallet["activity"]) {
  installTestPlatform();
  return unlockedWallet((w) => ({
    ...w,
    portfolios: w.portfolios.map((p) => ({ ...p, label: "Investing" })),
    activity: entries(w.portfolios[0].id),
  }));
}

describe("activityRow", () => {
  it("names trackers, signs money in and out, and speaks the sign", async () => {
    const wallet = await walletWithEntries((id) => [
      activity({ id: "fund", portfolioId: id, kind: "fund", amount: 100, usd: 100, at: NOW }),
      activity({
        id: "buy",
        portfolioId: id,
        kind: "buy",
        symbol: "NVDAx",
        amount: 0.4239,
        shown: 0.4239,
        usd: 100,
        at: NOW,
      }),
      activity({ id: "send", portfolioId: id, kind: "send", usd: 5, amount: 5, counterparty: "x" }),
      activity({
        id: "sell",
        portfolioId: "gone",
        kind: "sell",
        symbol: "SPYx",
        usd: 0,
        amount: 1,
      }),
    ]);
    const rows = Object.fromEntries(wallet.activity.map((e) => [e.id, activityRow(wallet, e)]));
    expect(rows.fund).toMatchObject({
      icon: "in",
      title: "Money arrived",
      caption: "Investing",
      value: { text: "+$100.00", tone: "safe" },
      amount: "100.00 USDC",
    });
    expect(rows.buy).toMatchObject({
      icon: "bought",
      title: "Bought NVIDIA tracker",
      value: { text: "-$100.00", tone: "ink" },
      amount: "0.4239 NVDAx",
      spoken: "Bought NVIDIA tracker, Investing, 30 September, minus $100.00, 0.4239 NVDAx",
    });
    expect(rows.send).toMatchObject({
      title: "Sent",
      caption: "To an address you entered · Investing",
    });
    expect(JSON.stringify(rows.send)).not.toContain('"x"');
    expect(rows.sell).toMatchObject({
      title: "Sold SP500 tracker",
      caption: "Portfolio",
      value: { text: "Not priced", tone: "faint", priced: false },
      amount: "1.0000 SPYx (raw tokens)",
    });
  });
});

describe("activityListView", () => {
  it("is empty with its own words when nothing was ever recorded", async () => {
    const wallet = await walletWithEntries(() => []);
    expect(activityListView(wallet, "all", 50, NOW)).toEqual({
      kind: "none",
      title: "Your buys, sells and money moves will appear here.",
      detail:
        "History is kept on this phone only. A wallet restored on a new phone starts with an empty list.",
    });
  });

  it("groups newest first under Today, Yesterday and the date, and filters in place", async () => {
    const wallet = await walletWithEntries((id) => [
      activity({ portfolioId: id, kind: "fund", at: NOW - 3 * DAY }),
      activity({ portfolioId: id, kind: "buy", symbol: "NVDAx", at: NOW - DAY }),
      activity({ portfolioId: id, kind: "send", at: NOW }),
    ]);
    const all = activityListView(wallet, "all", 50, NOW);
    expect(all.kind === "list" && all.sections.map((s) => [s.title, s.rows.length])).toEqual([
      ["Today", 1],
      ["Yesterday", 1],
      ["27 Sep 2026", 1],
    ]);
    const trades = activityListView(wallet, "trades", 50, NOW);
    expect(
      trades.kind === "list" && trades.sections.flatMap((s) => s.rows.map((r) => r.title)),
    ).toEqual(["Bought NVIDIA tracker"]);
    const capped = activityListView(wallet, "all", 2, NOW);
    expect(capped.kind === "list" && capped.more).toBe(true);
  });

  it("says when nothing matches the filter", async () => {
    const wallet = await walletWithEntries((id) => [activity({ portfolioId: id, kind: "fund" })]);
    expect(activityListView(wallet, "trades", 50, NOW)).toEqual({
      kind: "noMatch",
      title: "Nothing matches that filter.",
    });
  });
});

describe("activityDetailView", () => {
  it("holds everything recorded, with a send's recipient kept apart", async () => {
    const at = new Date(2026, 8, 28, 14, 32).getTime();
    const wallet = await walletWithEntries((id) => [
      activity({
        id: "s",
        portfolioId: id,
        kind: "send",
        amount: 5,
        usd: 5,
        at,
        counterparty: "Dest",
      }),
    ]);
    expect(activityDetailView(wallet, "s")).toMatchObject({
      title: "Sent",
      headline: "-$5.00",
      portfolio: { name: "Investing" },
      date: "28 Sep 2026, 14:32",
      amount: "5.00 USDC",
      value: "$5.00",
      recipient: "Dest",
    });
    expect(activityDetailView(wallet, "missing")).toBeNull();
  });
});

describe("dates", () => {
  it("writes days and times the same on every runtime", () => {
    expect(shortDate(new Date(2026, 8, 3).getTime())).toBe("3 Sep 2026");
    expect(dateAndTime(new Date(2026, 0, 9, 7, 5).getTime())).toBe("9 Jan 2026, 07:05");
    expect(dayHeading(NOW - 2 * DAY, NOW)).toBe("28 Sep 2026");
  });
});
