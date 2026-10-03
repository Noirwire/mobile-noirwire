import { fireEvent, screen } from "@testing-library/react-native";
import { activity, renderScreen, unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { ActivityScreen } from "./ActivityScreen";

jest.mock("@/ui/secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

afterEach(() => forgetWallet());

const NOW = new Date(2026, 8, 30, 12, 0).getTime();
const RECIPIENT = "Dest1111Dest2222Dest3333Dest4444";

async function show(entries: (id: string) => Parameters<typeof activity>[0][]) {
  installTestPlatform();
  const wallet = await unlockedWallet((w) => ({
    ...w,
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
});
