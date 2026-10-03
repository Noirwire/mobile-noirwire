import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { forgetWallet, installTestPlatform, renderWith, testServices } from "../testServices";
import { installFakeRelay, walletWith } from "../trade/testDoubles";
import { TrackerScreen } from "./TrackerScreen";

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

async function show(symbol = "NVDAx", options: { visitor?: boolean; online?: boolean } = {}) {
  const onIntent = jest.fn();
  await renderWith(
    await testServices({ useOnline: () => options.online ?? true }),
    <TrackerScreen symbol={symbol} visitor={options.visitor} onIntent={onIntent} />,
  );
  return onIntent;
}

describe("TrackerScreen", () => {
  it("shows the live price, its change, the chart with its text alternative, and what is held", async () => {
    installTestPlatform();
    installFakeRelay();
    const [investing] = await walletWith([{ label: "Investing", holdings: { NVDAx: 5.1075 } }]);
    const onIntent = await show();
    expect(await screen.findByText("$235.91")).toBeOnTheScreen();
    expect(screen.getByText("Indicative")).toBeOnTheScreen();
    expect(screen.getByText("+2.21%")).toBeOnTheScreen();
    expect(screen.getByText("Your order price is confirmed at review.")).toBeOnTheScreen();
    expect(
      await screen.findByRole("image", {
        name: "1 day price chart. Started at 230 dollars 70 cents, now 235 dollars 89 cents, up 2.25 percent.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Historical prices · Jupiter")).toBeOnTheScreen();
    expect(screen.getByText("5.1075 NVDAx")).toBeOnTheScreen();
    expect(screen.getByText("$1,204.91 indicative value")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Investing · 5.1075 NVDAx" }));
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "portfolio", id: investing });
    await fireEvent.press(screen.getByRole("button", { name: "Sell" }));
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "sell" });
    await fireEvent.press(screen.getByRole("button", { name: "Buy" }));
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "buy" });
    await fireEvent.press(screen.getByRole("button", { name: "Read the risks" }));
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "risks" });
  });

  it("offers Buy alone and says nothing is owned when nothing is held", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing" }]);
    await show();
    expect(await screen.findByText("You do not own this tracker yet.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Buy" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Sell" })).toBeNull();
  });

  it("draws no chart without real history, naming the range", async () => {
    installTestPlatform();
    installFakeRelay({ history: null });
    await walletWith([{ label: "Investing" }]);
    await show();
    expect(await screen.findByText("No verified 1D chart available.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: "1W" }));
    expect(await screen.findByText("No verified 1W chart available.")).toBeOnTheScreen();
    expect(screen.queryByRole("image")).toBeNull();
  });

  it("shows no number when the price is unavailable, and keeps Buy and Sell enabled", async () => {
    installTestPlatform();
    installFakeRelay({ prices: null });
    await walletWith([{ label: "Investing", holdings: { NVDAx: 2 } }]);
    await show();
    expect(await screen.findByText("Current price unavailable")).toBeOnTheScreen();
    expect(screen.getByText("At review")).toBeOnTheScreen();
    expect(
      screen.getByText("Your order price comes from a live quote at review."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Value available when a current price loads")).toBeOnTheScreen();
    expect(screen.queryByText("Indicative")).toBeNull();
    expect(screen.getByRole("button", { name: "Buy" })).toBeEnabled();
  });

  it("disables Buy and Sell while offline", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing", holdings: { NVDAx: 2 } }]);
    await show("NVDAx", { online: false });
    await waitFor(() => expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Sell" })).toBeDisabled();
  });

  it("offers to create a portfolio when there is none", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([]);
    const onIntent = await show();
    await fireEvent.press(await screen.findByRole("button", { name: "Create a portfolio" }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "createPortfolio" });
  });

  it("says when a symbol is not a listed tracker", async () => {
    installTestPlatform();
    installFakeRelay();
    await walletWith([{ label: "Investing" }]);
    const onIntent = await show("NOPEx");
    expect(screen.getByText("No such investment.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Back to Markets" }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "markets" });
  });

  it("shows a visitor no holding and no trade, and the risks in place", async () => {
    installTestPlatform();
    installFakeRelay();
    const onIntent = await show("NVDAx", { visitor: true });
    expect(await screen.findByText("$235.91")).toBeOnTheScreen();
    expect(screen.queryByText("Your holding")).toBeNull();
    expect(screen.queryByRole("button", { name: "Buy" })).toBeNull();
    expect(screen.queryByRole("button", { name: /watchlist/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Read the risks" }));
    expect(screen.getByText("What a tracker is")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Create a wallet to invest" }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "createWallet" });
  });
});
