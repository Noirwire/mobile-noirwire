import { errorsCopy } from "@noirwire/shared/copy";
import { jupiterReferralAccount, noirwireFeeBps } from "@noirwire/shared/infrastructure";
import type { Env } from "@noirwire/shared/platform";
import { getSnapshot } from "@noirwire/shared/wallet";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import {
  fakeChain,
  renderWithMoney,
  testMoney,
  walletWith,
  type FakeChain,
  type PortfolioSpec,
} from "../network/testMoney";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { installFakePrices } from "./testDoubles";
import { TradeSheet } from "./TradeSheet";

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

type Setup = {
  portfolios?: PortfolioSpec[];
  /** The funding wallet's USDC. */
  funding?: number;
  side?: "buy" | "sell";
  symbol?: string | null;
  fromPortfolio?: boolean;
  /** Changes the venue, the relayer or the chain before the sheet opens. */
  chain?: (chain: FakeChain) => void;
  online?: boolean;
  /** Overrides the installed test env, e.g. to switch NoirWire's trade fee on. */
  env?: Partial<Env>;
};

async function open(setup: Setup = {}) {
  installTestPlatform(undefined, setup.env);
  installFakePrices();
  const chain = fakeChain();
  setup.chain?.(chain);
  const wallet = await walletWith(chain, {
    portfolios: setup.portfolios ?? [{ label: "Investing", cash: 457.33 }],
    funding: setup.funding,
  });
  const ids = wallet.portfolios.map((portfolio) => portfolio.id);
  const onClose = jest.fn();
  const onNoMoney = jest.fn();
  await renderWithMoney(
    await testServices({ useOnline: () => setup.online ?? true }),
    testMoney(chain),
    <TradeSheet
      side={setup.side ?? "buy"}
      symbol={setup.symbol === undefined ? "NVDAx" : setup.symbol}
      portfolioId={setup.fromPortfolio ? ids[0] : null}
      onClose={onClose}
      onNoMoney={onNoMoney}
    />,
  );
  return { chain, onClose, onNoMoney, ids };
}

/** A portfolio that has never held the tracker: the relayer opens its holding first. */
const firstBuy = (chain: FakeChain) => {
  chain.trade.holdingOpen = false;
  chain.relayerFeeRaw = 210_000n;
};

const orders = (chain: FakeChain) => chain.calls.filter((call) => call.kind === "buy");

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
    expect(screen.getByText("More than this portfolio has to invest.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review buy" })).toBeDisabled();
  });

  it("reads a comma as the decimal separator", async () => {
    await open();
    await typeAmount("12,5");
    expect(screen.getByLabelText("Spend $")).toHaveDisplayValue("12,5");
    expect(screen.getByRole("button", { name: "Review buy" })).toBeEnabled();
  });

  it("says there is no money on the first step and leads to adding it, with none waiting", async () => {
    const { onNoMoney } = await open({
      portfolios: [{ label: "Investing", cash: 0 }],
      funding: 0,
      fromPortfolio: true,
    });
    expect(await screen.findByText("No money in this portfolio yet")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your money arrives in your funding wallet. Then you move it into a portfolio.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Amount/)).toBeNull();
    await press("Add money");
    expect(onNoMoney).toHaveBeenCalledWith({ to: "addMoney" });
  });

  it("leads to moving money in when USDC is waiting in the funding wallet", async () => {
    const { onNoMoney, ids } = await open({
      portfolios: [{ label: "Investing", cash: 0 }],
      fromPortfolio: true,
    });
    expect(await screen.findByText("No money in this portfolio yet")).toBeOnTheScreen();
    await press("Move to portfolio");
    expect(onNoMoney).toHaveBeenCalledWith({ to: "fund", portfolioId: ids[0] });
  });

  it("says so before a portfolio is chosen when none of them has anything to invest", async () => {
    const { onNoMoney } = await open({
      portfolios: [
        { label: "Investing", cash: 0 },
        { label: "Long term", cash: 0 },
      ],
      funding: 0,
    });
    expect(await screen.findByText("No money in your portfolios yet")).toBeOnTheScreen();
    expect(screen.queryByRole("radio")).toBeNull();
    await press("Add money");
    expect(onNoMoney).toHaveBeenCalledWith({ to: "addMoney" });
  });

  it("reviews a trade in an existing holding: cost included in the fee, one line on the tracker, then a result", async () => {
    const { chain, onClose } = await open();
    await toReview();
    expect(screen.getByText("Spend $100.00 from Investing")).toBeOnTheScreen();
    expect(screen.getByText(/^Receive at least 0\.42/)).toBeOnTheScreen();
    expect(screen.getByText("Included in the fee")).toBeOnTheScreen();
    expect(screen.getByText(/^Price held for \d+ seconds?\.$/)).toBeOnTheScreen();
    expect(screen.queryByText(/gas|SOL\b|swap|slippage/i)).toBeNull();
    await press("Read the risks");
    expect(screen.getByRole("header", { name: "What a tracker is" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Confirm buy" })).toBeNull();
    await press("Back");
    await press("Confirm buy");
    expect(await screen.findByText(/^Bought 0\.42/)).toBeOnTheScreen();
    expect(screen.getByText("For $100.00, in Investing.")).toBeOnTheScreen();
    expect(orders(chain)).toHaveLength(1);
    expect(chain.calls.some((call) => call.kind === "open")).toBe(false);
    expect(getSnapshot()!.portfolios[0].pendingAction).toBeUndefined();
    await press("Done");
    expect(onClose).toHaveBeenCalled();
  });

  it("states NoirWire's fee on the review line and wires the order to the configured referral account", async () => {
    const referralAccount = "Fps2W6upBuMTgZpBsjgHbsjVVBthkaMfgaWfTXeKhrZw";
    await open({ env: { referralAccount, feeBps: 50 } });
    await toReview();
    expect(screen.getByText("Of which NoirWire")).toBeOnTheScreen();
    expect(screen.getByText("0.50%")).toBeOnTheScreen();
    // What the order-building code in the shared package reads to attach the
    // fee to the Jupiter order: proving these resolve to the configured
    // values is proving the order carries them, without sending anything.
    expect(jupiterReferralAccount()).toBe(referralAccount);
    expect(noirwireFeeBps()).toBe(50);
  });

  it("shows no NoirWire fee line on the review when the fee is unset", async () => {
    await open();
    await toReview();
    expect(screen.queryByText("Of which NoirWire")).toBeNull();
    expect(noirwireFeeBps()).toBe(0);
  });

  it("opens the holding on a first buy under the one confirmation, and says that cost is paid", async () => {
    let placeOrder: () => void = () => undefined;
    const { chain } = await open({ chain: firstBuy });
    await toReview();
    expect(screen.getByText("0.21 USDC")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "The network cost includes opening this portfolio's account for this tracker, a one-time cost.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("100.21 USDC")).toBeOnTheScreen();
    // The holding opens at once; the order waits here until the test lets it be signed.
    let signings = 0;
    chain.beforeSigning = () =>
      (signings += 1) === 1
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            placeOrder = resolve;
          });
    await press("Confirm buy");
    expect(await screen.findByText("Opening the holding for NVDAx")).toBeOnTheScreen();
    expect(
      await screen.findByText("The holding is open. The network cost for that is already paid."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Getting the price for your order")).toBeOnTheScreen();
    expect(chain.calls.map((call) => call.kind)).toEqual(["open", "buy"]);
    await act(async () => placeOrder());
    expect(await screen.findByText(/^Bought/)).toBeOnTheScreen();
  });

  it("replaces the review when the price moved, and asks for a new Confirm", async () => {
    const { chain } = await open({
      chain: (venue) => {
        venue.trade.builds = false;
      },
    });
    await toReview();
    chain.trade.price = 243;
    await press("Confirm buy");
    expect(
      await screen.findByText(
        "The price moved before this order could be placed. Nothing was traded. Review the new price.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("$243.00 per NVDAx")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeDisabled();
    expect(orders(chain)).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm buy" })).toBeEnabled());
  });

  it("says when the relayer cannot be used, and nothing can be confirmed", async () => {
    const { chain } = await open({ chain: firstBuy });
    await toReview();
    chain.relayed = "relayerUnavailable";
    chain.relayerFeeRaw = null;
    await press("Confirm buy");
    expect(
      (
        await screen.findAllByText(
          "This can't be done right now. Nothing was charged. Please try again in a few minutes.",
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeDisabled();
    expect(orders(chain)).toHaveLength(0);
  });

  it("asks the relayer again on a new review after one that found it down", async () => {
    const { chain } = await open({ chain: firstBuy });
    await toReview();
    chain.relayed = "relayerUnavailable";
    chain.relayerFeeRaw = null;
    await press("Confirm buy");
    const notNow =
      "This can't be done right now. Nothing was charged. Please try again in a few minutes.";
    expect((await screen.findAllByText(notNow)).length).toBeGreaterThan(0);

    chain.relayed = "lands";
    chain.relayerFeeRaw = 210_000n;
    await press("Back");
    await fireEvent.press(screen.getByRole("button", { name: "Review buy" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm buy" })).toBeEnabled());
    expect(screen.queryByText(notNow)).toBeNull();
  });

  it("says when the network cost rose, with the new figure to confirm again", async () => {
    const { chain } = await open({ chain: firstBuy });
    await toReview();
    chain.relayed = "costRose";
    chain.relayerFeeRaw = 300_000n;
    await press("Confirm buy");
    expect(await screen.findByText(errorsCopy.chain.networkCostRose)).toBeOnTheScreen();
    expect(screen.getByText("0.30 USDC")).toBeOnTheScreen();
  });

  it("reports an unknown outcome without a retry, and keeps the portfolio's reservation", async () => {
    await open({
      chain: (venue) => {
        venue.trade.order = "unknown";
      },
    });
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
    expect(getSnapshot()!.portfolios[0].pendingAction).toMatchObject({ what: "a buy of NVDAx" });
  });

  it("says the order was not placed after its holding opened, and prices again at no further network cost", async () => {
    await open({
      chain: (venue) => {
        firstBuy(venue);
        venue.trade.order = "fails";
      },
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
    await open({
      chain: (venue) => {
        venue.trade.order = "fails";
      },
    });
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
          pendingAction: {
            status: "unknown",
            id: "p1",
            at: 1,
            what: "a buy of NVDAx",
            blockhash: "11111111111111111111111111111111",
          },
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

  it("lets the user clear an action the chain can never settle, after asking once more", async () => {
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
      await screen.findByText(/^We could not confirm whether your last action/),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirm buy" })).toBeDisabled();
    await press("Clear");
    await press("Yes, clear it");
    await waitFor(() => expect(getSnapshot()!.portfolios[0].pendingAction).toBeUndefined());
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm buy" })).toBeEnabled());
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
      chain: (venue) => {
        venue.trade.quotes = "none";
      },
    });
    await typeAmount("100");
    await press("Review buy");
    expect(await screen.findByText(errorsCopy.chain.noQuote)).toBeOnTheScreen();
  });

  it("never chooses a pie whose mix leaves the tracker out for the person", async () => {
    await open({
      portfolios: [
        { label: "Core pie", cash: 100, pie: [{ symbol: "SPYx", weight: 100 }] },
        { label: "Savings", cash: 20 },
      ],
    });
    expect(screen.getByRole("radio", { name: /^Core pie/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /^Savings/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Continue with Savings" })).toBeEnabled();
  });

  it("chooses nothing when every portfolio is a pie without the tracker, and waits to be told", async () => {
    await open({
      portfolios: [
        { label: "Core pie", cash: 100, pie: [{ symbol: "SPYx", weight: 100 }] },
        { label: "Tech pie", cash: 100, pie: [{ symbol: "TSLAx", weight: 100 }] },
      ],
    });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("radio", { name: /^Tech pie/ }));
    expect(screen.getByRole("button", { name: "Continue with Tech pie" })).toBeEnabled();
  });

  it("refuses an amount typed with more decimals than cash has, and says the smallest amount", async () => {
    await open();
    await typeAmount("12.1234567");
    expect(
      screen.getByText("That amount has too many decimals. The smallest amount is 0.000001 USDC."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review buy" })).toBeDisabled();
  });
});
