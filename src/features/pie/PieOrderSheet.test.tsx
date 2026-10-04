import { errorsCopy } from "@noirwire/shared/copy";
import type { PieSlice } from "@noirwire/shared/domain";
import { fireEvent, screen } from "@testing-library/react-native";
import {
  fakeChain,
  renderWithMoney,
  testMoney,
  walletWith,
  type FakeChain,
  type PortfolioSpec,
} from "../network/testMoney";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { installFakePrices } from "../trade/testDoubles";
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
  shape: (chain: FakeChain) => void = () => undefined,
) {
  installTestPlatform();
  installFakePrices();
  const chain = fakeChain();
  shape(chain);
  const wallet = await walletWith(chain, {
    portfolios: [{ label: "Core", cash: 500, pie: TWO, ...spec }],
  });
  const [{ id }] = wallet.portfolios;
  const onNoMoney = jest.fn();
  const onClose = jest.fn();
  await renderWithMoney(
    await testServices(),
    testMoney(chain),
    <PieOrderSheet portfolioId={id} mode={mode} onClose={onClose} onNoMoney={onNoMoney} />,
  );
  return { id, chain, onNoMoney, onClose };
}

/** A pie that has never held its trackers: the relayer opens each holding first. */
const firstBuys = (chain: FakeChain) => {
  chain.trade.holdingOpen = false;
  chain.relayerFeeRaw = 210_000n;
};

const placed = (chain: FakeChain, side: "buy" | "sell" = "buy") =>
  chain.calls.filter((call) => call.kind === side).map((call) => call.symbol);

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));

describe("PieOrderSheet", () => {
  it("splits an amount toward the targets, reviews every order and places them one at a time", async () => {
    const { chain, onClose } = await open();
    expect(screen.getByText("Invest in Core")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    expect(screen.getByText("How it splits, toward your targets")).toBeOnTheScreen();
    expect(screen.getByText("$60.00")).toBeOnTheScreen();
    expect(screen.getByText("$40.00")).toBeOnTheScreen();
    await press("Review orders");
    expect(await screen.findByRole("button", { name: "Place 2 orders" })).toBeEnabled();
    await press("Place 2 orders");
    expect(await screen.findByText("All 2 orders placed")).toBeOnTheScreen();
    expect(placed(chain)).toEqual(["NVDAx", "SPYx"]);
    await press("Done");
    expect(onClose).toHaveBeenCalled();
  });

  it("stops at the first failed order and places nothing after it", async () => {
    const three: PieSlice[] = [
      { symbol: "NVDAx", weight: 50 },
      { symbol: "SPYx", weight: 30 },
      { symbol: "QQQx", weight: 20 },
    ];
    const { chain } = await open({ pie: three }, "invest", (venue) => {
      venue.trade.failing.add("SPYx");
    });
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "300");
    await press("Review orders");
    await press(
      await screen.findByRole("button", { name: "Place 3 orders" }).then(() => "Place 3 orders"),
    );
    expect(await screen.findByText("1 of 3 orders placed")).toBeOnTheScreen();
    expect(screen.getByLabelText("NVIDIA, Placed")).toBeOnTheScreen();
    expect(screen.getByLabelText("SP500, Failed")).toBeOnTheScreen();
    expect(screen.getByLabelText("Nasdaq, Not placed")).toBeOnTheScreen();
    expect(placed(chain)).toEqual(["NVDAx", "SPYx"]);
    expect(
      screen.getByText(
        "Nothing after the stopped order was placed. Check the balances before going on.",
      ),
    ).toBeOnTheScreen();
  });

  it("works out the smallest amount for this mix before any pricing, and offers to use it", async () => {
    const { chain } = await open({
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
    expect(chain.calls).toEqual([]);
  });

  it("opens the holdings first when the review says so, and says that cost is paid", async () => {
    const { chain } = await open({}, "invest", firstBuys);
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    await press("Review orders");
    expect(
      await screen.findByText(
        "The network cost includes opening this portfolio's accounts for 2 trackers, a one-time cost.",
      ),
    ).toBeOnTheScreen();
    await press("Place 2 orders");
    expect(await screen.findByText("All 2 orders placed")).toBeOnTheScreen();
    expect(chain.calls.map((call) => call.kind)).toEqual(["open", "buy", "buy"]);
    expect(
      screen.getAllByText("The holdings are open. The network cost for that is already paid.")
        .length,
    ).toBeGreaterThan(0);
  });

  it("places nothing when the holdings could not be opened", async () => {
    const { chain } = await open({}, "invest", firstBuys);
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    await press("Review orders");
    await screen.findByRole("button", { name: "Place 2 orders" });
    chain.relayed = "relayerUnavailable";
    await press("Place 2 orders");
    expect(await screen.findByText("No order was placed")).toBeOnTheScreen();
    expect(placed(chain)).toEqual([]);
  });

  it("returns to the amount with the tracker named when an order cannot be priced", async () => {
    await open({}, "invest", (venue) => {
      venue.trade.unpriced.add("SPYx");
    });
    await fireEvent.changeText(screen.getByLabelText("Invest $"), "100");
    await press("Review orders");
    expect(await screen.findByText(`SPYx: ${errorsCopy.chain.noQuote}`)).toBeOnTheScreen();
  });

  it("leads to moving money in when the pie has nothing to invest", async () => {
    const { onNoMoney, id } = await open({ cash: 0 });
    expect(screen.getByText("No money in this pie yet")).toBeOnTheScreen();
    await press("Move to portfolio");
    expect(onNoMoney).toHaveBeenCalledWith({ to: "fund", portfolioId: id });
  });

  it("sells only what sits above target on a rebalance, and says when nothing does", async () => {
    await open({ holdings: { NVDAx: 1, SPYx: 0.2044 } }, "rebalance");
    expect(
      await screen.findByText("Nothing is far enough above target to sell."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Price the sells" })).toBeDisabled();
  });

  it("prices and places the sells of a drifted pie, then prices the buys from what they returned", async () => {
    const { chain } = await open({ holdings: { NVDAx: 1 } }, "rebalance");
    expect(await screen.findByText("Sell NVIDIA")).toBeOnTheScreen();
    await press("Price the sells");
    expect(await screen.findByText("Step 1 of 2: sell what is above target.")).toBeOnTheScreen();
    await press("Place 1 order");
    expect(
      await screen.findByText("Step 2 of 2: invest what the sells returned."),
    ).toBeOnTheScreen();
    expect(placed(chain, "sell")).toEqual(["NVDAx"]);
    expect(placed(chain)).toEqual([]);
  });
});
