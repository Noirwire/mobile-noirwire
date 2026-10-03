import type { Attempt } from "@noirwire/shared/application";
import type { PieSlice } from "@noirwire/shared/domain";
import { fireEvent, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { forgetWallet, installTestPlatform, renderWith, testServices } from "../testServices";
import {
  PHONE_METRICS,
  confirmed,
  fakeTradeService,
  installFakeRelay,
  walletWith,
  type PortfolioSpec,
} from "../trade/testDoubles";
import { TradeServiceProvider, type Order, type TradeService } from "../trade/tradeService";
import { PieOrderSheet, type PieOrderMode } from "./PieOrderSheet";

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

const TWO: PieSlice[] = [
  { symbol: "NVDAx", weight: 60 },
  { symbol: "SPYx", weight: 40 },
];

async function open(
  spec: Partial<PortfolioSpec> = {},
  mode: PieOrderMode = "invest",
  service: Partial<TradeService> = {},
) {
  installTestPlatform();
  installFakeRelay();
  const [id] = await walletWith([{ label: "Core", cash: 500, pie: TWO, ...spec }]);
  const fake = fakeTradeService(service);
  const onAddMoney = jest.fn();
  const onClose = jest.fn();
  await renderWith(
    await testServices(),
    <SafeAreaProvider initialMetrics={PHONE_METRICS}>
      <TradeServiceProvider value={fake}>
        <PieOrderSheet portfolioId={id} mode={mode} onClose={onClose} onAddMoney={onAddMoney} />
      </TradeServiceProvider>
    </SafeAreaProvider>,
  );
  return { id, service: fake, onAddMoney, onClose };
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));

describe("PieOrderSheet", () => {
  it("splits an amount toward the targets, reviews every order and places them one at a time", async () => {
    const { service, onClose } = await open();
    expect(screen.getByText("Invest in Core")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    expect(screen.getByText("How it splits, toward your targets")).toBeOnTheScreen();
    expect(screen.getByText("$60.00")).toBeOnTheScreen();
    expect(screen.getByText("$40.00")).toBeOnTheScreen();
    await press("Review orders");
    expect(await screen.findByRole("button", { name: "Place 2 orders" })).toBeEnabled();
    expect(
      screen.getByText("These are trackers, not shares, and their issuer keeps control over them."),
    ).toBeOnTheScreen();
    expect(screen.getByText("This portfolio's trades and holdings are public.")).toBeOnTheScreen();
    await press("Place 2 orders");
    expect(await screen.findByText("All 2 orders placed")).toBeOnTheScreen();
    expect(service.place).toHaveBeenCalledTimes(2);
    expect(service.place.mock.calls.map((call) => (call[1] as Order).stock.symbol)).toEqual([
      "NVDAx",
      "SPYx",
    ]);
    await press("Done");
    expect(onClose).toHaveBeenCalled();
  });

  it("stops at the first failed order and places nothing after it", async () => {
    const three: PieSlice[] = [
      { symbol: "NVDAx", weight: 50 },
      { symbol: "SPYx", weight: 30 },
      { symbol: "QQQx", weight: 20 },
    ];
    const { service } = await open({ pie: three });
    service.place.mockResolvedValueOnce(confirmed).mockResolvedValueOnce({
      kind: "failed",
      reason: "tradeFailed",
      completed: [],
    } satisfies Attempt<Order>);
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "300");
    await press("Review orders");
    await press(
      await screen.findByRole("button", { name: "Place 3 orders" }).then(() => "Place 3 orders"),
    );
    expect(await screen.findByText("1 of 3 orders placed")).toBeOnTheScreen();
    expect(screen.getByLabelText("NVIDIA, Placed")).toBeOnTheScreen();
    expect(screen.getByLabelText("SP500, Failed")).toBeOnTheScreen();
    expect(screen.getByLabelText("Nasdaq, Not placed")).toBeOnTheScreen();
    expect(service.place).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(
        "Nothing after the stopped order was placed. Check the balances before going on.",
      ),
    ).toBeOnTheScreen();
  });

  it("works out the smallest amount for this mix before any pricing, and offers to use it", async () => {
    const { service } = await open({
      pie: [
        { symbol: "NVDAx", weight: 90 },
        { symbol: "SPYx", weight: 10 },
      ],
    });
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "50");
    expect(
      screen.getByText(
        "With this mix, invest at least about $120.00 right now so every order can be placed. This figure is approximate and depends on live prices.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review orders" })).toBeDisabled();
    await press("Use $120.00");
    expect(screen.getByLabelText("Invest $")).toHaveDisplayValue("120");
    expect(screen.getByRole("button", { name: "Review orders" })).toBeEnabled();
    expect(service.quote).not.toHaveBeenCalled();
  });

  it("opens the holdings first when the review says so, and says that cost is paid", async () => {
    const { service } = await open({}, "invest", {
      reviewCost: async () => ({
        lamports: 4_000_000,
        cost: { kind: "relayer", fee: 0.42, feeRaw: 210_000n, opens: "holding", count: 2 },
      }),
    });
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    await press("Review orders");
    expect(
      await screen.findByText(
        "The network cost includes opening this portfolio's accounts for 2 trackers, a one-time cost.",
      ),
    ).toBeOnTheScreen();
    await press("Place 2 orders");
    expect(await screen.findByText("All 2 orders placed")).toBeOnTheScreen();
    expect(service.openHoldings).toHaveBeenCalledWith(
      expect.any(String),
      ["NVDAx", "SPYx"],
      210_000n,
    );
    expect(
      screen.getAllByText("The holdings are open. The network cost for that is already paid.")
        .length,
    ).toBeGreaterThan(0);
  });

  it("places nothing when the holdings could not be opened", async () => {
    const { service } = await open({}, "invest", {
      reviewCost: async () => ({
        lamports: 4_000_000,
        cost: { kind: "relayer", fee: 0.42, feeRaw: 210_000n, opens: "holding", count: 2 },
      }),
    });
    service.openHoldings.mockResolvedValueOnce({
      kind: "refused",
      reason: "costUnavailable",
      completed: [],
    });
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    await press("Review orders");
    await press(
      await screen.findByRole("button", { name: "Place 2 orders" }).then(() => "Place 2 orders"),
    );
    expect(await screen.findByText("No order was placed")).toBeOnTheScreen();
    expect(service.place).not.toHaveBeenCalled();
  });

  it("returns to the amount with the tracker named when an order cannot be priced", async () => {
    await open({}, "invest", {
      quote: jest.fn(async (_id: string, _side: string, symbol: string) =>
        symbol === "SPYx"
          ? { error: "Could not get a price for this trade." }
          : { plan: undefined as never },
      ),
    });
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    await press("Review orders");
    expect(
      await screen.findByText("SPYx: Could not get a price for this trade."),
    ).toBeOnTheScreen();
  });

  it("leads to adding money when the pie has no cash", async () => {
    const { onAddMoney, id } = await open({ cash: 0 });
    expect(screen.getByText("This pie has no cash to invest.")).toBeOnTheScreen();
    await press("Add money");
    expect(onAddMoney).toHaveBeenCalledWith(id);
  });

  it("sells only what sits above target on a rebalance, and says when nothing does", async () => {
    await open({ holdings: { NVDAx: 1, SPYx: 0.2044 } }, "rebalance");
    expect(
      await screen.findByText("Nothing is far enough above target to sell."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Price the sells" })).toBeDisabled();
  });

  it("prices and places the sells of a drifted pie", async () => {
    const { service } = await open({ holdings: { NVDAx: 1 } }, "rebalance");
    expect(await screen.findByText("Sell NVIDIA")).toBeOnTheScreen();
    await press("Price the sells");
    expect(await screen.findByText("Step 1 of 2: sell what is above target.")).toBeOnTheScreen();
    await press("Place 1 order");
    expect(await screen.findByText("All 1 orders placed")).toBeOnTheScreen();
    expect((service.place.mock.calls[0][1] as Order).side).toBe("sell");
  });
});
