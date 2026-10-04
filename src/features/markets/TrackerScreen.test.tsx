import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import { CHART_HOLD_TEST_ID } from "@/ui/Chart";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import {
  fakeChain,
  portfoliosWith as walletWith,
  renderWithMoney,
  testMoney,
} from "../network/testMoney";
import { installFakePrices } from "../trade/testDoubles";
import { TrackerScreen } from "./TrackerScreen";

type HoldEvent = (event: { x: number }, success?: boolean) => void;
type HoldHandlers = { onStart: HoldEvent; onUpdate: HoldEvent; onFinalize: HoldEvent };

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

async function show(symbol = "NVDAx", options: { visitor?: boolean; online?: boolean } = {}) {
  const onIntent = jest.fn();
  await renderWithMoney(
    await testServices({ useOnline: () => options.online ?? true }),
    testMoney(fakeChain()),
    <TrackerScreen symbol={symbol} visitor={options.visitor} onIntent={onIntent} />,
  );
  return onIntent;
}

describe("TrackerScreen", () => {
  it("shows the live price, its change, the chart with its text alternative, and what is held", async () => {
    installTestPlatform();
    installFakePrices();
    const [investing] = await walletWith([{ label: "Investing", holdings: { NVDAx: 5.1075 } }]);
    const onIntent = await show();
    expect(await screen.findByText("$235.91")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "NVIDIA" })).toBeOnTheScreen();
    expect(screen.getByText("NVIDIA tracker · NVDAx")).toBeOnTheScreen();
    expect(
      screen.getByText("Follows NVIDIA's share price. You do not own a share."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Approximate price")).toBeOnTheScreen();
    expect(screen.getByText("The smallest order is about $12.")).toBeOnTheScreen();
    expect(screen.queryByText(/out of date/)).toBeNull();
    expect(screen.getByText("+2.21%")).toBeOnTheScreen();
    expect(screen.getByText("The final price is shown before you buy.")).toBeOnTheScreen();
    expect(
      await screen.findByRole("adjustable", {
        name: "1 day price chart. Started at 230 dollars 70 cents, now 235 dollars 89 cents, up 2.25 percent.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Historical prices")).toBeOnTheScreen();
    expect(screen.getByText("High $235.89")).toBeOnTheScreen();
    expect(screen.getByText("Low $229.90")).toBeOnTheScreen();
    expect(screen.getByText("5.1075 NVDAx")).toBeOnTheScreen();
    expect(screen.getByText("$1,204.91 approximate value")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Investing · 5.1075 NVDAx" }));
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "portfolio", id: investing });
    await fireEvent.press(screen.getByRole("button", { name: "Sell" }));
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "sell" });
    await fireEvent.press(screen.getByRole("button", { name: "Buy" }));
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "buy" });
    expect(screen.queryByText(/freeze or remove/)).toBeNull();
    expect(screen.queryByText(/multiplier|burn|Jupiter/i)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Read the risks" }));
    expect(
      screen.getByText("The company that issues this tracker can freeze or remove it."),
    ).toBeOnTheScreen();
    expect(screen.getByText("What a tracker is")).toBeOnTheScreen();
  });

  it("reads out the price and date under a finger held on the chart, and says it", async () => {
    installTestPlatform();
    installFakePrices();
    await walletWith([{ label: "Investing" }]);
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    await show();
    const chart = await screen.findByRole("adjustable", { name: /^1 day price chart/ });
    await fireEvent(chart, "layout", { nativeEvent: { layout: { width: 316, height: 220 } } });
    expect(screen.queryByText("$229.90")).toBeNull();
    // 316 wide with 8 of padding either side: five points, 75 apart. 158 is the third.
    // The gesture's own callbacks are called one at a time: the test helper
    // that fires a whole gesture always runs it to its end, and what is under
    // test here is what shows while the finger is still down.
    const held = () =>
      (getByGestureTestId(CHART_HOLD_TEST_ID) as unknown as { handlers: HoldHandlers }).handlers;
    await act(async () => held().onStart({ x: 158 }));
    expect(screen.getByText("$229.90")).toBeOnTheScreen();
    expect(announce).toHaveBeenLastCalledWith(expect.stringMatching(/^\$229\.90, /));
    await act(async () => held().onUpdate({ x: 308 }));
    expect(screen.getByText("$235.89")).toBeOnTheScreen();
    expect(announce).toHaveBeenLastCalledWith(expect.stringMatching(/^\$235\.89, /));
    await act(async () => held().onFinalize({ x: 308 }, true));
    expect(screen.queryByText("$235.89")).toBeNull();
  });

  it("lets a screen reader step through the same points", async () => {
    installTestPlatform();
    installFakePrices();
    await walletWith([{ label: "Investing" }]);
    await show();
    const chart = await screen.findByRole("adjustable", { name: /^1 day price chart/ });
    await fireEvent(chart, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(screen.getByText("$233.40")).toBeOnTheScreen();
    expect(chart).toHaveAccessibilityValue({ text: /^\$233\.40, / });
    await fireEvent(chart, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(chart).toHaveAccessibilityValue({ text: /^\$235\.89, / });
  });

  it("offers Buy alone and says nothing is owned when nothing is held", async () => {
    installTestPlatform();
    installFakePrices();
    await walletWith([{ label: "Investing" }]);
    await show();
    expect(await screen.findByText("You do not own this tracker yet.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Buy" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Sell" })).toBeNull();
  });

  it("draws no chart without real history, and says it is unavailable", async () => {
    installTestPlatform();
    installFakePrices({ history: null });
    await walletWith([{ label: "Investing" }]);
    await show();
    expect(await screen.findByText("Chart unavailable right now.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: "1W" }));
    expect(await screen.findByText("Chart unavailable right now.")).toBeOnTheScreen();
    expect(screen.queryByRole("adjustable")).toBeNull();
  });

  it("shows no number when the price is unavailable, and keeps Buy and Sell enabled", async () => {
    installTestPlatform();
    installFakePrices({ prices: null });
    await walletWith([{ label: "Investing", holdings: { NVDAx: 2 } }]);
    await show();
    expect(await screen.findByText("Current price unavailable")).toBeOnTheScreen();
    expect(screen.getByText("At review")).toBeOnTheScreen();
    expect(screen.getByText("The final price is shown before you buy.")).toBeOnTheScreen();
    expect(
      screen.getByText("We couldn't update prices. What you see may be out of date."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Value available when a current price loads")).toBeOnTheScreen();
    expect(screen.queryByText("Approximate price")).toBeNull();
    expect(screen.getByRole("button", { name: "Buy" })).toBeEnabled();
  });

  it("disables Buy and Sell while offline", async () => {
    installTestPlatform();
    installFakePrices();
    await walletWith([{ label: "Investing", holdings: { NVDAx: 2 } }]);
    await show("NVDAx", { online: false });
    await waitFor(() => expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Sell" })).toBeDisabled();
  });

  it("offers to create a portfolio when there is none", async () => {
    installTestPlatform();
    installFakePrices();
    await walletWith([]);
    const onIntent = await show();
    await fireEvent.press(await screen.findByRole("button", { name: "Create a portfolio" }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "createPortfolio" });
  });

  it("says when a symbol is not a listed tracker", async () => {
    installTestPlatform();
    installFakePrices();
    await walletWith([{ label: "Investing" }]);
    const onIntent = await show("NOPEx");
    expect(screen.getByText("No such investment.")).toBeOnTheScreen();
    expect(screen.queryByText("No matching investment.")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Back to Markets" }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "markets" });
  });

  it("shows a visitor no holding and no trade, and the risks in place", async () => {
    installTestPlatform();
    installFakePrices();
    const onIntent = await show("NVDAx", { visitor: true });
    expect(await screen.findByText("$235.91")).toBeOnTheScreen();
    expect(screen.queryByText("Your holding")).toBeNull();
    expect(screen.queryByRole("button", { name: "Buy" })).toBeNull();
    expect(screen.queryByRole("button", { name: /watchlist/ })).toBeNull();
    expect(screen.getByText("The smallest order is about $12.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Read the risks" }));
    expect(screen.getByText("What a tracker is")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Create a wallet to invest" }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "createWallet" });
  });
});
