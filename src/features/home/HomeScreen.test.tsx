import { getSnapshot } from "@noirwire/shared/wallet";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import {
  activity,
  fakeBalances,
  holding,
  renderScreen,
  seedLivePrices,
  unlockedWallet,
  withHolding,
} from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { HomeScreen, RESTORED_MS } from "./HomeScreen";

let updatedAt: number;

beforeEach(async () => {
  installTestPlatform();
  updatedAt ??= await seedLivePrices();
});
afterEach(() => {
  jest.useRealTimers();
  return forgetWallet();
});

function handlers() {
  return {
    onNavigate: jest.fn(),
    onOpenPortfolio: jest.fn(),
    onOpenTracker: jest.fn(),
    onNewPortfolio: jest.fn(),
    onSeeAllActivity: jest.fn(),
    onOpenEarn: jest.fn(),
    onLock: jest.fn(),
  };
}

async function populated() {
  return unlockedWallet((w) => {
    const [first] = w.portfolios;
    const investing = withHolding(
      withHolding({ ...first, label: "Investing" }, holding("USDC", 457.33)),
      holding("NVDAx", 5.1075, 400),
    );
    return {
      ...w,
      portfolios: [investing],
      activity: [
        activity({ portfolioId: first.id, kind: "buy", symbol: "NVDAx", usd: 100, shown: 1 }),
      ],
    };
  });
}

describe("HomeScreen", () => {
  it("shows the total, the cash line, portfolios, investments and recent activity", async () => {
    await populated();
    const on = handlers();
    const balances = fakeBalances();
    await renderScreen(
      await testServices(),
      <HomeScreen {...on} pricesUpdatedAt={updatedAt} />,
      balances,
    );
    expect(
      screen.getByLabelText("Total value, $968.08, +$10.22 (2.0%) held trackers · 24h indicative"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Cash available to invest")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Find trackers" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add money" })).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: /^Investing, \$457\.33 cash · 1 holding, \$968\.08/ }),
    );
    expect(on.onOpenPortfolio).toHaveBeenCalledWith(getSnapshot()!.portfolios[0].id);
    await fireEvent.press(
      screen.getByRole("button", { name: "NVIDIA tracker, NVDAx · 5.1075 tokens, $510.75" }),
    );
    expect(on.onOpenTracker).toHaveBeenCalledWith("NVDAx");
    expect(
      screen.getByRole("button", { name: /^Bought NVIDIA tracker, Investing/ }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "See all" }));
    expect(on.onSeeAllActivity).toHaveBeenCalled();
    await waitFor(() => expect(balances.calls).toEqual(["everything"]));
    expect(screen.queryByText(/[A-HJ-NP-Za-km-z1-9]{32,44}/)).toBeNull();
  });

  it("shows what every portfolio has in Earn together, leading to the Earn tab", async () => {
    await populated();
    const on = handlers();
    const balances = fakeBalances();
    balances.money.earnVenue.position = async () => ({
      deposited: 120.5,
      earnedSinceDeposit: null,
      hasReceiptAccount: true,
      lamports: 0,
    });
    await renderScreen(
      await testServices(),
      <HomeScreen {...on} pricesUpdatedAt={updatedAt} />,
      balances,
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Earning, $120.50" }));
    expect(on.onOpenEarn).toHaveBeenCalled();
  });

  it("says Earn could not be read rather than showing nothing in it", async () => {
    await populated();
    const balances = fakeBalances();
    balances.money.earnVenue.position = async () => {
      throw new Error("unreadable");
    };
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
      balances,
    );
    expect(await screen.findByRole("button", { name: "Earning, Unavailable" })).toBeOnTheScreen();
  });

  it("leaves Earn out while nothing is in it, and where it is not offered", async () => {
    await populated();
    const balances = fakeBalances();
    const { unmount } = await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
      balances,
    );
    await act(async () => undefined);
    expect(screen.queryByText("Earning")).toBeNull();
    await unmount();

    balances.money.earnChain.available = () => false;
    balances.money.earnVenue.position = async () => {
      throw new Error("Earn is not offered here.");
    };
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
      balances,
    );
    await act(async () => undefined);
    expect(screen.queryByText("Earning")).toBeNull();
  });

  it("leads an empty wallet with Add USDC and the funding address, and How to add money", async () => {
    await unlockedWallet();
    const on = handlers();
    await renderScreen(await testServices(), <HomeScreen {...on} pricesUpdatedAt={updatedAt} />);
    expect(screen.getByLabelText("Total value, $0.00")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Add USDC" }));
    expect(on.onNavigate).toHaveBeenLastCalledWith({ to: "receive", reveal: false });
    await fireEvent.press(screen.getByRole("button", { name: "Show funding address" }));
    expect(on.onNavigate).toHaveBeenLastCalledWith({ to: "receive", reveal: true });
    expect(screen.queryByText("1. Get USDC on Solana")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "How to add money" }));
    expect(screen.getByText("1. Get USDC on Solana")).toBeOnTheScreen();
    expect(
      screen.getByText("This first transfer is public and may link the sending address to you."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Look at trackers first" }));
    expect(on.onNavigate).toHaveBeenLastCalledWith({ to: "markets" });
  });

  it("explains the combined total on request", async () => {
    await unlockedWallet();
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Shown together only here" }));
    expect(screen.getByText(/This total is added up on this phone/)).toBeOnTheScreen();
  });

  it("shows no number while prices are missing", async () => {
    await populated();
    await renderScreen(await testServices(), <HomeScreen {...handlers()} pricesUpdatedAt={null} />);
    expect(
      screen.getByLabelText(
        "Total value, Value unavailable, Waiting for current balances or market prices",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Price unavailable")).toBeOnTheScreen();
    expect(screen.queryByText("$968.08")).toBeNull();
  });

  it("says when balances could not be refreshed, and keeps the last values", async () => {
    await populated();
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
      fakeBalances(false),
    );
    expect(await screen.findByText("Could not refresh. Pull down to try again.")).toBeOnTheScreen();
    expect(screen.getByText("$457.33")).toBeOnTheScreen();
  });

  it("does not read balances while offline", async () => {
    await populated();
    const balances = fakeBalances();
    await renderScreen(
      await testServices({ useOnline: () => false }),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
      balances,
    );
    await act(async () => undefined);
    expect(balances.calls).toEqual([]);
  });

  it("offers moving USDC that arrived in the funding wallet as the one primary", async () => {
    const wallet = await unlockedWallet((w) => ({
      ...w,
      portfolios: w.portfolios.map((p) => ({ ...p, label: "Investing" })),
      funding: { ...w.funding, tokens: { ...w.funding.tokens, USDC: 250 } },
    }));
    const on = handlers();
    await renderScreen(await testServices(), <HomeScreen {...on} pricesUpdatedAt={updatedAt} />);
    expect(screen.getByText(/250\.00 USDC has arrived in your funding wallet/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Move money to Investing" }));
    expect(on.onNavigate).toHaveBeenCalledWith({
      to: "fund",
      portfolioId: wallet.portfolios[0].id,
    });
    await fireEvent.press(screen.getByRole("button", { name: "Add money" }));
    expect(on.onNavigate).toHaveBeenLastCalledWith({ to: "fund" });
  });

  it("restores an archived portfolio at once and says so for two seconds", async () => {
    await unlockedWallet((w) => ({
      ...w,
      portfolios: w.portfolios.map((p) => ({ ...p, label: "Old", archivedAt: 1 })),
    }));
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
    );
    expect(screen.getByText("Create a portfolio to start investing.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Archived portfolios (1)" }));
    jest.useFakeTimers();
    await fireEvent.press(screen.getByRole("button", { name: "Restore Old" }));
    await waitFor(() => expect(getSnapshot()!.portfolios[0].archivedAt).toBeNull());
    expect(screen.getByText("Restored.")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(RESTORED_MS);
    });
    expect(screen.queryByText("Restored.")).toBeNull();
  });

  it("opens New portfolio, and locks from the top bar", async () => {
    await unlockedWallet();
    const on = handlers();
    await renderScreen(await testServices(), <HomeScreen {...on} pricesUpdatedAt={updatedAt} />);
    await fireEvent.press(screen.getByRole("button", { name: "New portfolio" }));
    expect(on.onNewPortfolio).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Lock wallet" }));
    expect(on.onLock).toHaveBeenCalled();
  });

  it("opens an activity entry's detail from Recent activity", async () => {
    await populated();
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Bought NVIDIA tracker/ }));
    const detail = await screen.findByText("Value at the time");
    expect(detail).toBeOnTheScreen();
    expect(
      within(screen.getByText("Value at the time").parent!.parent!).getByText("$100.00"),
    ).toBeTruthy();
  });
});
