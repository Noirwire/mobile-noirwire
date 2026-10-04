import { fireEvent, screen } from "@testing-library/react-native";
import { activity, renderScreen, unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { ActivityScreen } from "./ActivityScreen";

jest.mock("@/ui/secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

afterEach(() => forgetWallet());

const NOW = new Date(2026, 8, 30, 12, 0).getTime();
const RECIPIENT = "Dest1111Dest2222Dest3333Dest4444";

async function show(entries: (id: string) => Parameters<typeof activity>[0][], imported = false) {
  installTestPlatform();
  const wallet = await unlockedWallet((w) => ({
    ...w,
    ...(imported ? { imported: true as const } : {}),
    portfolios: w.portfolios.map((p) => ({ ...p, label: "Investing" })),
    activity: entries(w.portfolios[0].id).map(activity),
  }));
  const onOpenPortfolio = jest.fn();
  await renderScreen(
    await testServices(),
    <ActivityScreen onOpenPortfolio={onOpenPortfolio} now={() => NOW} />,
  );
  return { wallet, onOpenPortfolio };
}

describe("ActivityScreen", () => {
  it("says history is kept on this phone when nothing has moved", async () => {
    await show(() => []);
    expect(
      screen.getByText("Your buys, sells and money moves will appear here."),
    ).toBeOnTheScreen();
    expect(screen.getByText(/History is kept on this phone only/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Trades" })).toBeNull();
  });

  it("lists entries by day and filters them with the chips", async () => {
    await show((id) => [
      { portfolioId: id, kind: "fund", at: NOW, usd: 100, amount: 100 },
      { portfolioId: id, kind: "buy", symbol: "NVDAx", at: NOW, usd: 50, amount: 0.5, shown: 0.5 },
    ]);
    expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: /^Money arrived, Investing, 30 September, plus \$100\.00/,
      }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Trades" }));
    expect(screen.queryByText("Money arrived")).toBeNull();
    expect(screen.getByText("Bought NVIDIA tracker")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Money sent" }));
    expect(screen.getByText("Nothing matches that filter.")).toBeOnTheScreen();
  });

  it("lists what moved into and out of Earn, under its own filter", async () => {
    await show((id) => [
      { portfolioId: id, kind: "fund", at: NOW, usd: 100, amount: 100 },
      { portfolioId: id, kind: "earnDeposit", at: NOW, usd: 40, amount: 40 },
      { portfolioId: id, kind: "earnWithdraw", at: NOW, usd: 15, amount: 15 },
    ]);
    await fireEvent.press(screen.getByRole("button", { name: "Earn" }));
    expect(screen.queryByText("Money arrived")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: /^Moved into Earn, Investing, 30 September, minus \$40\.00/,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: /^Returned from Earn, Investing, 30 September, plus \$15\.00/,
      }),
    ).toBeOnTheScreen();
  });

  it("opens an entry's detail, with a send's address held back until Show", async () => {
    const { wallet, onOpenPortfolio } = await show((id) => [
      { portfolioId: id, kind: "send", at: NOW, usd: 5, amount: 5, counterparty: RECIPIENT },
    ]);
    await fireEvent.press(screen.getByRole("button", { name: /^Sent, To an address you entered/ }));
    expect(screen.getByText("Value at the time")).toBeOnTheScreen();
    expect(screen.getByText("An address you entered")).toBeOnTheScreen();
    expect(screen.queryByText(/Dest1111/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Show the address it was sent to" }));
    expect(screen.getByText("Dest 1111 Dest 2222\nDest 3333 Dest 4444")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Hide the address" }));
    expect(screen.queryByText(/Dest1111|Dest 1111/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Portfolio, Investing" }));
    expect(onOpenPortfolio).toHaveBeenCalledWith(wallet.portfolios[0].id);
    expect(screen.queryByText("Value at the time")).toBeNull();
  });

  it("shows what a return from Earn really brought once its network cost was taken out", async () => {
    await show((id) => [
      { portfolioId: id, kind: "earnWithdraw", at: NOW, usd: 10, amount: 10, networkCost: 0.02 },
    ]);
    const row = screen.getByRole("button", {
      name: /^Returned from Earn, Investing, 30 September, plus \$9\.98, 9\.98 USDC, Network cost 0\.02 USDC$/,
    });
    expect(screen.getByText("+$9.98")).toBeOnTheScreen();
    expect(screen.getByText("Network cost 0.02 USDC")).toBeOnTheScreen();
    await fireEvent.press(row);
    expect(screen.getByText("Amount")).toBeOnTheScreen();
    expect(screen.getByText("10.00 USDC")).toBeOnTheScreen();
    expect(screen.getByText("Network cost")).toBeOnTheScreen();
    expect(screen.getByText("0.02 USDC")).toBeOnTheScreen();
    expect(screen.getByText("Arrived")).toBeOnTheScreen();
  });

  it("shows no network cost on an entry that was charged none", async () => {
    await show((id) => [{ portfolioId: id, kind: "fund", at: NOW, usd: 100, amount: 100 }]);
    expect(screen.queryByText(/Network cost/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: /^Money arrived/ }));
    expect(screen.queryByText("Network cost")).toBeNull();
    expect(screen.queryByText("Arrived")).toBeNull();
  });

  describe("on an imported wallet", () => {
    const note =
      "This wallet was imported on this phone. Activity from before the import, made on another device, is not shown here. Your balances are complete.";
    const funded = (id: string) => [
      { portfolioId: id, kind: "fund" as const, at: NOW, usd: 100, amount: 100 },
    ];

    it("says earlier activity is not shown when nothing has moved here yet", async () => {
      await show(() => [], true);
      expect(screen.getByText(note)).toBeOnTheScreen();
    });

    it("says so under the entries made since the import", async () => {
      await show(funded, true);
      expect(screen.getByText("Money arrived")).toBeOnTheScreen();
      expect(screen.getByText(note)).toBeOnTheScreen();
    });

    it("says nothing of an import on a wallet created here", async () => {
      await show(funded);
      expect(screen.queryByText(note)).toBeNull();
    });
  });

  it("says older entries are no longer kept once the list has reached the most the phone keeps", async () => {
    await show((id) =>
      Array.from({ length: 500 }, (_, index) => ({
        portfolioId: id,
        kind: index < 2 ? ("buy" as const) : ("fund" as const),
        symbol: index < 2 ? "NVDAx" : "USDC",
        at: NOW - index * 60_000,
        usd: 1,
        amount: 1,
      })),
    );
    const older =
      "Only your 500 most recent entries are kept on this phone. Older ones are no longer shown here. Your money is not affected.";
    // Fifty of five hundred are shown: there is more to scroll to, so nothing is said yet.
    expect(screen.queryByText(older)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Trades" }));
    expect(screen.getByText(older)).toBeOnTheScreen();
  });
});
