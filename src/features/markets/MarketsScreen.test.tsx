import { getSnapshot } from "@noirwire/shared/wallet";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { forgetWallet, installTestPlatform, renderWith, testServices } from "../testServices";
import { portfoliosWith as walletWith } from "../network/testMoney";
import { installFakeRelay } from "../trade/testDoubles";
import { MarketsScreen } from "./MarketsScreen";

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

async function show(visitor = false) {
  const onOpen = jest.fn();
  const onCreate = jest.fn();
  await renderWith(
    await testServices(),
    <MarketsScreen
      onOpen={onOpen}
      visitor={visitor ? { onCreate, createLabel: "Create a wallet to invest" } : undefined}
    />,
  );
  return { onOpen, onCreate };
}

describe("MarketsScreen", () => {
  it("holds the place of the list with skeletons until the first prices answer", async () => {
    installTestPlatform();
    installFakeRelay();
    global.fetch = jest.fn(() => new Promise(() => undefined)) as unknown as typeof fetch;
    await walletWith([{ label: "Investing" }]);
    await show();
    expect(screen.queryByText("Browse all")).toBeNull();
    expect(screen.getByText("Markets")).toBeOnTheScreen();
  });

  it("shows live prices on the shelves and the list, and opens a tracker", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing" }]);
    const { onOpen } = await show();
    expect(await screen.findByText("Top movers")).toBeOnTheScreen();
    expect(screen.getByText("24h change")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Funds and ETFs" })).toBeOnTheScreen();
    const nvidia = screen.getAllByRole("button", {
      name: /^NVIDIA, NVDAx, \$235\.91, up 2\.21 percent today$/,
    });
    await fireEvent.press(nvidia[nvidia.length - 1]);
    expect(onOpen).toHaveBeenCalledWith("NVDAx");
  });

  it("shows no number and no change without a live price", async () => {
    installTestPlatform();
    installFakeRelay({ prices: null });
    await walletWith([{ label: "Investing" }]);
    await show();
    // The list's place is held for a moment first, in case the prices are only late.
    expect(
      await screen.findByText("Top movers appear when current prices load.", undefined, {
        timeout: 8_000,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "We couldn't load prices. They are missing or out of date here, and are asked for again every half minute.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("At review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No live price").length).toBeGreaterThan(0);
    expect(screen.queryByText("$235.91")).toBeNull();
  }, 15_000);

  it("searches by ticker without its trailing x, by name, and says when nothing matches", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing" }]);
    await show();
    const search = screen.getByLabelText("Search trackers");
    await fireEvent.changeText(search, "nvda");
    expect(screen.getByText("1 result")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^NVIDIA, NVDAx/ })).toBeOnTheScreen();
    await fireEvent.changeText(search, "zzzz");
    expect(screen.getByText("No matching investment.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Browse all")).toBeOnTheScreen();
  });

  it("stars a tracker into the watchlist and filters by it, with the empty watchlist explained", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing" }]);
    await act(async () => {
      const { updateWallet } = await import("@noirwire/shared/wallet");
      await updateWallet((wallet) => ({ ...wallet, watchlist: [] }));
    });
    await show();
    await screen.findByText("Top movers");
    await fireEvent.press(screen.getByRole("button", { name: "My watchlist" }));
    expect(screen.getByText("Your watchlist is empty.")).toBeOnTheScreen();
    expect(screen.getByText("Tap the star on a tracker to save it here.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "All" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Add TSLAx to watchlist" })[0]);
    expect(getSnapshot()?.watchlist).toEqual(["TSLAx"]);
    await fireEvent.press(screen.getByRole("button", { name: "My watchlist" }));
    expect(screen.getAllByRole("button", { name: "Remove TSLAx from watchlist" }).length).toBe(1);
  });

  it("lists 25 at a time", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing" }]);
    await show();
    await screen.findByText("Browse all");
    expect(screen.getByRole("button", { name: "Show 15 more" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Show 15 more" }));
    expect(screen.queryByRole("button", { name: /Show \d+ more/ })).toBeNull();
  });

  it("gives a visitor no watchlist and one way forward", async () => {
    installTestPlatform();
    installFakeRelay();
    const { onCreate } = await show(true);
    await screen.findByText("Top movers");
    expect(screen.queryByText("My watchlist")).toBeNull();
    expect(screen.queryByRole("button", { name: /watchlist/ })).toBeNull();
    expect(screen.queryByText(/^Buy$|^Sell$/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Create a wallet to invest" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("says when a link named a tracker that does not exist", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing" }]);
    await renderWith(await testServices(), <MarketsScreen onOpen={jest.fn()} unknownTracker />);
    expect(screen.getByText("No such investment.")).toBeOnTheScreen();
  });
});
