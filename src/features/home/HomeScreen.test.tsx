import {
  STILL_WORKING_AFTER_MS,
  WAITING_DELAY_MS,
  WAIT_LIMIT_MS,
} from "@noirwire/shared/presentation";
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
import { SIGNATURE_ARC_TEST_ID } from "@/ui/SignatureArc";
import { HomeScreen, RESTORED_MS } from "./HomeScreen";

const HIDDEN = { includeHiddenElements: true };

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
      screen.getByLabelText("Total value, $968.08, +$10.22 (2.0%) held trackers · 24h approximate"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ready to invest")).toBeOnTheScreen();
    expect(screen.getByTestId(SIGNATURE_ARC_TEST_ID, HIDDEN)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Find trackers" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add money" })).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", {
        name: /^Investing, \$457\.33 to invest · 1 holding, \$968\.08/,
      }),
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

  it("leads an empty wallet with one Add money button, the line under it, and no arc", async () => {
    await unlockedWallet();
    const on = handlers();
    await renderScreen(await testServices(), <HomeScreen {...on} pricesUpdatedAt={updatedAt} />);
    expect(screen.getByLabelText("Total value, $0.00")).toBeOnTheScreen();
    expect(screen.getByText("Ready to invest")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: /Add money|funding/i })).toHaveLength(1);
    expect(
      screen.getByText(
        "Your money arrives in your funding wallet. Then you move it into a portfolio.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Find trackers" })).toBeNull();
    expect(screen.queryByTestId(SIGNATURE_ARC_TEST_ID, HIDDEN)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Add money" }));
    expect(on.onNavigate).toHaveBeenLastCalledWith({ to: "addMoney" });
    await fireEvent.press(screen.getByRole("button", { name: "Look at trackers first" }));
    expect(on.onNavigate).toHaveBeenLastCalledWith({ to: "markets" });
  });

  it("explains the combined total on request", async () => {
    await unlockedWallet();
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Only you see this total" }));
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
    expect(
      await screen.findByText(
        "We couldn't update your balances. What you see may be out of date. Pull down to try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("$457.33")).toBeOnTheScreen();
  });

  it("offers a plain retry after a failed read, which asks again", async () => {
    await populated();
    const balances = fakeBalances(false);
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
      balances,
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(balances.calls).toEqual(["everything", "everything"]));
  });

  it("holds the balance's place quietly at first, then as loading, and never for ever", async () => {
    await unlockedWallet((wallet) => ({ ...wallet, portfolios: [] }));
    jest.useFakeTimers();
    const never = fakeBalances();
    never.money.refresh.everything = () => new Promise<boolean>(() => undefined);
    await renderScreen(
      await testServices(),
      <HomeScreen {...handlers()} pricesUpdatedAt={updatedAt} />,
      never,
    );
    expect(screen.queryAllByLabelText("Loading")).toHaveLength(0);
    expect(screen.queryByText("Total value")).toBeNull();
    await act(() => jest.advanceTimersByTimeAsync(WAITING_DELAY_MS));
    expect(screen.getAllByLabelText("Loading").length).toBeGreaterThan(0);
    await act(() => jest.advanceTimersByTimeAsync(STILL_WORKING_AFTER_MS.content));
    expect(screen.getByText("Still loading. This is taking longer than usual.")).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(WAIT_LIMIT_MS.content));
    expect(screen.queryAllByLabelText("Loading")).toHaveLength(0);
    expect(
      screen.getByText(
        "We couldn't update your balances. What you see may be out of date. Pull down to try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    // Twenty seconds of the placeholder's animation frames pass under the fake clock.
  }, 20_000);

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
    await fireEvent.press(screen.getByRole("button", { name: "Move to Investing" }));
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
