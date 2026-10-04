import { earnCopy } from "@noirwire/shared/copy";
import { getSnapshot } from "@noirwire/shared/wallet";
import { fireEvent, screen } from "@testing-library/react-native";
import {
  fakeChain,
  renderWithMoney,
  testMoney,
  walletWith,
  type FakeChain,
} from "../network/testMoney";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { EarnScreen } from "./EarnScreen";

afterEach(() => forgetWallet());

async function openEarn(chain: FakeChain, online = true) {
  const handlers = { onNewPortfolio: jest.fn(), onMoveMoney: jest.fn() };
  await renderWithMoney(
    await testServices({ useOnline: () => online }),
    testMoney(chain),
    <EarnScreen {...handlers} />,
  );
  return handlers;
}

const amountField = () => screen.getByLabelText("Amount in USDC");

describe("EarnScreen", () => {
  it("shows the rate, what it is made of and each portfolio", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openEarn(chain);
    expect(await screen.findByText("4.16%")).toBeOnTheScreen();
    expect(screen.getByLabelText("Current variable rate, 4.16 percent a year")).toBeOnTheScreen();
    expect(screen.getByText(/3\.79%.*0\.37%/)).toBeOnTheScreen();
    expect(screen.getByText("$457.33 ready to invest")).toBeOnTheScreen();
    expect(await screen.findByText("$0.00")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Withdraw" })).toBeNull();
  });

  it("names who the USDC is lent through only behind Read the risks, on the screen itself", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openEarn(chain);
    await screen.findByText("4.16%");
    expect(screen.queryByText(/Jupiter/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Read the risks" }));
    expect(screen.getByRole("button", { name: "Read the risks" })).toBeExpanded();
    expect(screen.getByText(/Jupiter Lend/)).toBeOnTheScreen();
  });

  it("shows no stale rate when none can be read", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.earn.rate = null;
    await walletWith(chain);
    await openEarn(chain);
    expect(await screen.findByLabelText("Unavailable")).toBeOnTheScreen();
    expect(screen.queryByText(/\d%/)).toBeNull();
  });

  it("says one line where Earn does not run, with no rate, no rows and nothing to press", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.earn.available = false;
    await walletWith(chain);
    await openEarn(chain);
    expect(screen.getByText(earnCopy.mainnetOnly)).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/%|\$/)).toBeNull();
  });

  it("chooses the portfolio first, then deposits after one review with the network cost", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain);
    await openEarn(chain);
    await screen.findByText("$0.00");
    await fireEvent.press(screen.getByRole("button", { name: "Add to Earn" }));
    await fireEvent.press(
      screen.getByRole("radio", { name: "Investing, $457.33 ready to invest" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue with Investing" }));
    expect(screen.getByText("Lend USDC from Investing.")).toBeOnTheScreen();
    expect(await screen.findByText("457.31 USDC")).toBeOnTheScreen();

    await fireEvent.changeText(amountField(), "100");
    expect(
      screen.getByText(
        "About $4.16 in a year at today's 4.16% variable rate. This is an estimate, not a promise.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByText("Leaves Investing")).toBeOnTheScreen();
    expect(screen.getByText("Goes into Earn")).toBeOnTheScreen();
    expect(screen.getByText("0.02 USDC")).toBeOnTheScreen();
    expect(screen.getByLabelText("Total leaving Investing, 100.02 USDC")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Add 100.00 USDC to Earn" }));
    expect(await screen.findByText("Added 100.00 USDC to Earn")).toBeOnTheScreen();
    expect(screen.getByText("From Investing, now in Earn.")).toBeOnTheScreen();
    expect(chain.calls).toEqual([{ kind: "deposit", amount: 100, to: undefined }]);
    expect(chain.earn.deposited.get(wallet.portfolios[0].address)).toBe(100);
    expect(getSnapshot()!.activity[0]).toMatchObject({ kind: "earnDeposit", amount: 100 });
  });

  it("withdraws from a portfolio with no cash at all, paying the cost out of what returns", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain, { portfolios: [{ label: "Long term", cash: 0 }] });
    chain.earn.deposited.set(wallet.portfolios[0].address, 120);
    await openEarn(chain);
    expect(await screen.findByText("$120.00")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add to Earn" })).toBeDisabled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Long term, $0.00 ready to invest, $120.00 in Earn" }),
    );
    expect(screen.getByText("Return USDC to Long term.")).toBeOnTheScreen();
    await fireEvent.press(await screen.findByRole("button", { name: "Max" }));
    expect(amountField()).toHaveDisplayValue("120");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByText("Leaves Earn")).toBeOnTheScreen();
    expect(screen.getByLabelText("Arrives in Long term, 119.98 USDC")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "The network cost is paid out of the USDC this returns, so no USDC is needed first.",
      ),
    ).toBeOnTheScreen();
    const confirm = screen.getByRole("button", { name: "Withdraw 120.00 USDC" });
    expect(confirm).toBeEnabled();
    await fireEvent.press(confirm);
    expect(await screen.findByText("Withdrew 119.98 USDC")).toBeOnTheScreen();
    expect(screen.getByText("Back in Long term, ready to invest.")).toBeOnTheScreen();
  });

  it("refuses a withdrawal smaller than its own network cost", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain, { portfolios: [{ label: "Long term", cash: 0 }] });
    chain.earn.deposited.set(wallet.portfolios[0].address, 120);
    await openEarn(chain);
    await fireEvent.press(await screen.findByRole("button", { name: "Withdraw" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Long term, $120.00 in Earn" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue with Long term" }));
    await screen.findByRole("button", { name: "Review" });
    await fireEvent.changeText(amountField(), "0.01");
    expect(
      screen.getByText("This withdrawal is smaller than its own network cost."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("says the action cannot be done right now when the relayer is down, and charges nothing", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.relayerFeeRaw = null;
    const wallet = await walletWith(chain, { portfolios: [{ label: "Long term", cash: 0 }] });
    chain.earn.deposited.set(wallet.portfolios[0].address, 120);
    await openEarn(chain);
    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Long term, $0.00 ready to invest, $120.00 in Earn",
      }),
    );
    await fireEvent.changeText(amountField(), "50");
    await fireEvent.press(await screen.findByRole("button", { name: "Review" }));
    expect(
      screen.getByText(
        "This can't be done right now. Nothing was charged. Please try again in a few minutes.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Withdraw 50.00 USDC" })).toBeDisabled();
    expect(chain.calls).toHaveLength(0);
  });

  it("drops a failed attempt's message once the amount changes", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openEarn(chain);
    await fireEvent.press(
      await screen.findByRole("button", { name: /^Investing, \$457\.33 ready to invest/ }),
    );
    await fireEvent.changeText(amountField(), "100");
    await fireEvent.press(await screen.findByRole("button", { name: "Review" }));
    chain.relayed = "costRose";
    await fireEvent.press(screen.getByRole("button", { name: "Add 100.00 USDC to Earn" }));
    const failure =
      "The network cost rose before this could be sent. Nothing was sent. Review the new network cost.";
    expect(await screen.findByText(failure)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    await fireEvent.changeText(amountField(), "50");
    await fireEvent.press(await screen.findByRole("button", { name: "Review" }));
    expect(screen.getByRole("button", { name: "Add 50.00 USDC to Earn" })).toBeOnTheScreen();
    expect(screen.queryByText(failure)).toBeNull();
    expect(chain.calls).toEqual([{ kind: "deposit", amount: 100, to: undefined }]);
  });

  it("asks the relayer again on a new review after one that found it down", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openEarn(chain);
    await fireEvent.press(
      await screen.findByRole("button", { name: /^Investing, \$457\.33 ready to invest/ }),
    );
    await fireEvent.changeText(amountField(), "100");
    await fireEvent.press(await screen.findByRole("button", { name: "Review" }));
    chain.relayed = "relayerUnavailable";
    chain.relayerFeeRaw = null;
    await fireEvent.press(screen.getByRole("button", { name: "Add 100.00 USDC to Earn" }));
    const notNow =
      "This can't be done right now. Nothing was charged. Please try again in a few minutes.";
    expect((await screen.findAllByText(notNow)).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Add 100.00 USDC to Earn" })).toBeDisabled();

    chain.relayed = "lands";
    chain.relayerFeeRaw = 20_000n;
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Review" }));
    expect(screen.queryByText(notNow)).toBeNull();
    const confirm = screen.getByRole("button", { name: "Add 100.00 USDC to Earn" });
    expect(confirm).toBeEnabled();
    await fireEvent.press(confirm);
    expect(await screen.findByText("Added 100.00 USDC to Earn")).toBeOnTheScreen();
  });

  it("reports an unknown outcome and holds the portfolio's next Confirm until it settles", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.relayed = "unknown";
    await walletWith(chain);
    await openEarn(chain);
    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Investing, $457.33 ready to invest, $0.00 in Earn",
      }),
    );
    await fireEvent.changeText(amountField(), "10");
    await fireEvent.press(await screen.findByRole("button", { name: "Review" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add 10.00 USDC to Earn" }));
    expect(await screen.findByText("Sent, but not confirmed")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Close"));

    await fireEvent.press(
      await screen.findByRole("button", { name: /^Investing, .* ready to invest/ }),
    );
    await fireEvent.changeText(amountField(), "5");
    await fireEvent.press(await screen.findByRole("button", { name: "Review" }));
    expect(
      await screen.findByText(/Your last action from this portfolio .* is not confirmed yet/),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add 5.00 USDC to Earn" })).toBeDisabled();
    expect(chain.calls).toHaveLength(1);
  });

  it("disables both actions while offline", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain);
    chain.earn.deposited.set(wallet.portfolios[0].address, 10);
    await openEarn(chain, false);
    await screen.findByText("$10.00");
    expect(screen.getByRole("button", { name: "Add to Earn" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeDisabled();
  });

  it("does not offer a portfolio whose position cannot be read", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain);
    chain.earn.unreadable.add(wallet.portfolios[0].address);
    await openEarn(chain);
    expect(await screen.findByText("Unavailable")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Investing, $457.33 ready to invest, Unavailable in Earn",
      }),
    ).toBeDisabled();
    expect(getSnapshot()).not.toBeNull();
  });

  it("says a landed deposit is done when the new balances cannot be read back", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.unreadAfterAction = true;
    await walletWith(chain);
    await openEarn(chain);
    await screen.findByText("$0.00");
    await fireEvent.press(
      screen.getByRole("button", { name: "Investing, $457.33 ready to invest, $0.00 in Earn" }),
    );
    await screen.findByText("457.31 USDC");
    await fireEvent.changeText(amountField(), "100");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add 100.00 USDC to Earn" }));
    expect(await screen.findByText("Added 100.00 USDC to Earn")).toBeOnTheScreen();
    expect(screen.getByText(/Balances will update shortly\.$/)).toBeOnTheScreen();
  });

  it("says what may be out of date when Earn cannot be read, and reads again on Try again", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.earn.rate = null;
    await walletWith(chain);
    await openEarn(chain);
    const stale = /out of date/;
    expect(await screen.findByText(stale)).toBeOnTheScreen();
    chain.earn.rate = { apy: 4.16, supplyApy: 3.79, rewardsApy: 0.37 };
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("4.16%")).toBeOnTheScreen();
    expect(screen.queryByText(stale)).toBeNull();
  });
});
