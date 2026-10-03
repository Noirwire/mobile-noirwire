import type { Attempt } from "@noirwire/shared/application";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { forgetWallet, installTestPlatform, renderWith, testServices } from "../testServices";
import {
  OPENS_HOLDING,
  PHONE_METRICS,
  fakeTradeService,
  installFakeRelay,
  order,
  walletWith,
  type PortfolioSpec,
} from "./testDoubles";
import { TradeServiceProvider, type Order, type TradeService } from "./tradeService";
import { TradeSheet } from "./TradeSheet";

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

type Setup = {
  portfolios?: PortfolioSpec[];
  side?: "buy" | "sell";
  symbol?: string | null;
  fromPortfolio?: boolean;
  service?: Partial<TradeService>;
  online?: boolean;
};

async function open(setup: Setup = {}) {
  installTestPlatform();
  installFakeRelay();
  const ids = await walletWith(setup.portfolios ?? [{ label: "Investing", cash: 457.33 }]);
  const service = fakeTradeService(setup.service);
  const onClose = jest.fn();
  const onAddMoney = jest.fn();
  await renderWith(
    await testServices({ useOnline: () => setup.online ?? true }),
    <SafeAreaProvider initialMetrics={PHONE_METRICS}>
      <TradeServiceProvider value={service}>
        <TradeSheet
          side={setup.side ?? "buy"}
          symbol={setup.symbol === undefined ? "NVDAx" : setup.symbol}
          portfolioId={setup.fromPortfolio ? ids[0] : null}
          onClose={onClose}
          onAddMoney={onAddMoney}
        />
      </TradeServiceProvider>
    </SafeAreaProvider>,
  );
  return { service, onClose, onAddMoney, ids };
}

async function typeAmount(text: string) {
  await fireEvent.changeText(await screen.findByLabelText("Spend $"), text);
}

async function toReview(text = "100") {
  await typeAmount(text);
  await fireEvent.press(screen.getByRole("button", { name: "Review buy" }));
  await screen.findByRole("button", { name: /Confirm buy/ });
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));

describe("TradeSheet", () => {
  it("asks which portfolio buys when more than one could", async () => {
    await open({
      portfolios: [
        { label: "Investing", cash: 457.33 },
        { label: "Savings", cash: 20 },
      ],
    });
    expect(screen.getByText("Which portfolio buys it?")).toBeOnTheScreen();
    expect(screen.getByText("457.33 USDC available")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: /^Savings/ }));
    await press("Continue with Savings");
    expect(await screen.findByLabelText("Spend $")).toBeOnTheScreen();
  });

  it("lists only portfolios that hold the tracker for a sale, and skips the step when one does", async () => {
    await open({
      side: "sell",
      portfolios: [
        { label: "Investing", cash: 10 },
        { label: "Savings", holdings: { NVDAx: 2 } },
      ],
    });
    expect(screen.queryByText("Which portfolio sells it?")).toBeNull();
    expect(await screen.findByText("Savings")).toBeOnTheScreen();
    expect(screen.getByText("Available 2.0000 NVDAx")).toBeOnTheScreen();
  });

  it("chooses a tracker when opened from a portfolio without one", async () => {
    await open({ symbol: null, fromPortfolio: true });
    expect(screen.getByText("Buy a tracker")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Tracker"), "tesla");
    await press("Tesla, TSLAx");
    expect(await screen.findByText("Tesla tracker")).toBeOnTheScreen();
  });

  it("holds Review back below the smallest order and says why", async () => {
    await open();
    await typeAmount("5");
    expect(screen.getByText("The smallest order is about 12 USDC.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review buy" })).toBeDisabled();
    await typeAmount("500");
    expect(screen.getByText("More than your available cash.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review buy" })).toBeDisabled();
  });

  it("leads to adding money when the portfolio has no cash", async () => {
    const { onAddMoney, ids } = await open({ portfolios: [{ label: "Investing", cash: 0 }] });
    expect(await screen.findByText("This portfolio has no cash to invest.")).toBeOnTheScreen();
    await press("Add money");
    expect(onAddMoney).toHaveBeenCalledWith(ids[0]);
  });

  it("reviews a trade in an existing holding: cost included in the fee, one line on the tracker, then a result", async () => {
    const { service, onClose } = await open();
    await toReview();
    expect(screen.getByText("Spend $100.00 from Investing")).toBeOnTheScreen();
    expect(screen.getByText(/^Receive at least 0\.42/)).toBeOnTheScreen();
    expect(screen.getByText("Included in the fee")).toBeOnTheScreen();
    expect(screen.getByText(/^Price held for \d+ seconds?\.$/)).toBeOnTheScreen();
    expect(
      screen.getByText("NVDAx is a tracker, not a share, and its issuer keeps control over it."),
    ).toBeOnTheScreen();
    expect(screen.getByText("This portfolio's trades and holdings are public.")).toBeOnTheScreen();
    expect(screen.queryByText(/gas|SOL\b|swap|slippage/i)).toBeNull();
    await press("Read the risks");
    expect(screen.getByText("What a tracker is")).toBeOnTheScreen();
    await press("Back");
    await press("Confirm buy");
    expect(await screen.findByText(/^Bought 0\.42/)).toBeOnTheScreen();
    expect(screen.getByText("For $100.00, in Investing.")).toBeOnTheScreen();
    expect(service.place).toHaveBeenCalledTimes(1);
    expect(service.place.mock.calls[0][2]).not.toHaveProperty("relayerFeeRaw");
    await press("Done");
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the holding on a first buy under the one confirmation, and says that cost is paid", async () => {
    let finish: (result: Attempt<Order>) => void = () => undefined;
    const { service } = await open({
      service: { reviewCost: async () => ({ lamports: 2_039_280, cost: OPENS_HOLDING }) },
    });
    service.place.mockImplementation(
      (_id: string, _plan: Order, network: { onStep?: (step: "covering" | "acting") => void }) =>
        new Promise((resolve) => {
          network.onStep?.("covering");
          network.onStep?.("acting");
          finish = resolve;
        }),
    );
    await toReview();
    expect(screen.getByText("0.21 USDC")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "The network cost includes opening this portfolio's account for this tracker, a one-time cost.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("100.21 USDC")).toBeOnTheScreen();
    await press("Confirm buy");
    expect(await screen.findByText("Opening the holding for NVDAx")).toBeOnTheScreen();
    expect(
      screen.getByText("The holding is open. The network cost for that is already paid."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Getting the price for your order")).toBeOnTheScreen();
    expect(service.place.mock.calls[0][2].relayerFeeRaw).toBe(210_000n);
    await act(async () =>
      finish({ kind: "confirmed", signature: "s", settlement: "balancesRead" }),
    );
    expect(await screen.findByText(/^Bought/)).toBeOnTheScreen();
  });

  it("states the smallest order at review and holds Confirm back", async () => {
    await open({
      service: {
        reviewCost: async () => ({ lamports: 5000, cost: { kind: "tooSmall", smallest: 12 } }),
      },
    });
    await toReview("20");
    expect(screen.getByText("The smallest order right now is about 12.00 USDC.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeDisabled();
  });

  it("replaces the review when the price moved, and asks for a new Confirm", async () => {
    const { service } = await open();
    const moved = order({ spend: 100, receive: 0.41, receiveAtLeast: 0.405, unitPrice: 243 });
    service.place.mockResolvedValueOnce({
      kind: "needsReview",
      change: { because: "priceMoved", replacement: moved },
      completed: [],
    });
    await toReview();
    await press("Confirm buy");
    expect(
      await screen.findByText(
        "The price moved before this order could be placed. Nothing was traded. Review the new price.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("$243.00 per NVDAx")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm buy" })).toBeEnabled());
  });

  it("says when the relayer cannot be used, and nothing can be confirmed", async () => {
    let calls = 0;
    const { service } = await open({
      service: {
        reviewCost: async () =>
          calls++ === 0
            ? { lamports: 2_039_280, cost: OPENS_HOLDING }
            : { lamports: 2_039_280, cost: { kind: "unavailable" } },
      },
    });
    service.place.mockResolvedValueOnce({
      kind: "needsReview",
      change: { because: "relayerUnavailable" },
      completed: [],
    });
    await toReview();
    await press("Confirm buy");
    expect(
      (
        await screen.findAllByText(
          "This can't be done right now. Nothing was charged. Please try again in a few minutes.",
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeDisabled();
  });

  it("says when the network cost rose, with the new figure to confirm again", async () => {
    let calls = 0;
    const rose = { ...OPENS_HOLDING, fee: 0.3, feeRaw: 300_000n };
    const { service } = await open({
      service: {
        reviewCost: async () => ({
          lamports: 2_039_280,
          cost: calls++ === 0 ? OPENS_HOLDING : rose,
        }),
      },
    });
    service.place.mockResolvedValueOnce({
      kind: "needsReview",
      change: { because: "networkCostRose" },
      completed: [],
    });
    await toReview();
    await press("Confirm buy");
    expect(
      await screen.findByText("The network cost rose before this could be sent. Nothing was sent."),
    ).toBeOnTheScreen();
    expect(screen.getByText("0.30 USDC")).toBeOnTheScreen();
  });

  it("reports an unknown outcome without a retry", async () => {
    const { service } = await open();
    service.place.mockResolvedValueOnce({ kind: "unknown", completed: [] });
    await toReview();
    await press("Confirm buy");
    expect(await screen.findByText("Sent, but not confirmed")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "This was sent but could not be confirmed. It may still go through. Check Investing's balance before trying again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Confirm|Try again|Retry|Review/ })).toBeNull();
  });

  it("says the order was not placed after its holding opened, and prices again at no further network cost", async () => {
    const { service } = await open({
      service: { reviewCost: async () => ({ lamports: 2_039_280, cost: OPENS_HOLDING }) },
    });
    service.place.mockResolvedValueOnce({
      kind: "failed",
      reason: "orderNotPlaced",
      completed: [{ step: "accountOpened", opens: "holding", signature: "o" }],
    });
    await toReview();
    await press("Confirm buy");
    expect(await screen.findByText("Order not placed")).toBeOnTheScreen();
    await press("Review a new price");
    expect(await screen.findByText("Already paid")).toBeOnTheScreen();
    expect(
      screen.getByText("The holding is open. The network cost for that is already paid."),
    ).toBeOnTheScreen();
  });

  it("returns to the review with the reason when the order failed before anything was paid", async () => {
    const { service } = await open();
    service.place.mockResolvedValueOnce({ kind: "failed", reason: "tradeFailed", completed: [] });
    await toReview();
    await press("Confirm buy");
    expect(await screen.findByText(/Nothing was traded\.$/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeOnTheScreen();
  });

  it("holds Confirm back while the portfolio's last action is unsettled", async () => {
    await open({
      portfolios: [
        {
          label: "Investing",
          cash: 457.33,
          pendingAction: { status: "unknown", id: "p1", at: 1, what: "a buy of NVDAx" },
        },
      ],
    });
    await toReview();
    expect(
      screen.getByText(
        /Your last action from this portfolio \(a buy of NVDAx\) is not confirmed yet/,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeDisabled();
  });

  it("disables Review and Confirm while offline", async () => {
    await open({ online: false });
    await typeAmount("100");
    expect(screen.getByRole("button", { name: "Review buy" })).toBeDisabled();
    expect(
      screen.getByText("You're offline. Nothing can be confirmed until you're back online."),
    ).toBeOnTheScreen();
  });

  it("shows the quote error on the amount step", async () => {
    await open({
      service: { quote: jest.fn(async () => ({ error: "Could not get a price for this trade." })) },
    });
    await typeAmount("100");
    await press("Review buy");
    expect(await screen.findByText("Could not get a price for this trade.")).toBeOnTheScreen();
  });
});
