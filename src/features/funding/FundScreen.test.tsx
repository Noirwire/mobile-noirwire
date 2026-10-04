import { FUNDING } from "@noirwire/shared/application";
import { getSnapshot } from "@noirwire/shared/wallet";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import {
  fakeChain,
  renderWithMoney,
  testMoney,
  walletWith,
  type FakeChain,
} from "../network/testMoney";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import {
  balancesUnavailable,
  STILL_WORKING_AFTER_MS,
  WAIT_LIMIT_MS,
} from "@noirwire/shared/presentation";
import { FundScreen } from "./FundScreen";

afterEach(() => {
  jest.useRealTimers();
  return forgetWallet();
});

const ARRIVAL_WAIT = { timeout: 8_000 };

async function openFund(
  chain: FakeChain,
  options: { portfolioId?: string | null; online?: boolean } = {},
) {
  const handlers = {
    onClose: jest.fn(),
    onAddMoney: jest.fn(),
    onSeePublicView: jest.fn(),
  };
  const money = testMoney(chain);
  const services = await testServices({ useOnline: () => options.online ?? true });
  const portfolioId =
    options.portfolioId === undefined ? getSnapshot()!.portfolios[0].id : options.portfolioId;
  await renderWithMoney(services, money, <FundScreen portfolioId={portfolioId} {...handlers} />);
  await screen.findByText("500.00 USDC");
  return { handlers, money };
}

const amountField = () => screen.getByLabelText("Amount in USDC");

describe("FundScreen", () => {
  it("shows the cost as plain arithmetic, starting from the flat relay fee", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openFund(chain);
    expect(screen.getByText("Move to portfolio")).toBeOnTheScreen();
    expect(screen.getByText("Arrives in Investing")).toBeOnTheScreen();
    expect(screen.getByText("+ 0.00 USDC")).toBeOnTheScreen();
    expect(screen.getByText("+ 0.20 USDC")).toBeOnTheScreen();
    expect(screen.getByText("0.20 USDC")).toBeOnTheScreen();

    await fireEvent.changeText(amountField(), "100");
    expect(screen.getByText("100.00 USDC")).toBeOnTheScreen();
    expect(screen.getByText("+ 0.10 USDC")).toBeOnTheScreen();
    expect(screen.getByText("100.30 USDC")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeEnabled();
  });

  it("shows no balance for a funding wallet that could not be read, until a retry reads it", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain, { balancesRead: false });
    const money = testMoney(chain);
    const read = money.refresh.funding;
    let reachable = false;
    money.refresh.funding = (...args) =>
      reachable ? read(...args) : Promise.reject(new Error("unreachable"));
    await renderWithMoney(
      await testServices(),
      money,
      <FundScreen
        portfolioId={wallet.portfolios[0].id}
        onClose={jest.fn()}
        onAddMoney={jest.fn()}
        onSeePublicView={jest.fn()}
      />,
    );
    const retry = await screen.findByRole("button", { name: balancesUnavailable().retry });
    expect(screen.queryByText("500.00 USDC")).toBeNull();
    reachable = true;
    await fireEvent.press(retry);
    expect(await screen.findByText("500.00 USDC")).toBeOnTheScreen();
  });

  it("states its fees on the form to the same decimal as on the review", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openFund(chain);
    await fireEvent.changeText(amountField(), "25");
    expect(screen.getByText("+ 0.025 USDC")).toBeOnTheScreen();
    expect(screen.getByText("25.225 USDC")).toBeOnTheScreen();
    expect(screen.queryByText(/0\.03 USDC|25\.23 USDC/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByText("0.025 USDC")).toBeOnTheScreen();
    expect(screen.getByText("25.225 USDC")).toBeOnTheScreen();
    expect(screen.queryByText(/0\.03 USDC|25\.23 USDC/)).toBeNull();
  });

  it("checks the minimum and the balance with fees, and disables presets it cannot cover", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain, { funding: 50 });
    const money = testMoney(chain);
    await renderWithMoney(
      await testServices(),
      money,
      <FundScreen
        portfolioId={getSnapshot()!.portfolios[0].id}
        onClose={jest.fn()}
        onAddMoney={jest.fn()}
        onSeePublicView={jest.fn()}
      />,
    );
    await screen.findByText("50.00 USDC");
    expect(screen.getByRole("button", { name: "25" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "50" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "100" })).toBeDisabled();

    await fireEvent.changeText(amountField(), "0.3");
    expect(screen.getByText("A private move has to be at least 0.50 USDC.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();

    await fireEvent.changeText(amountField(), "50");
    expect(
      screen.getByText(
        "With fees this takes 50.25 USDC from your funding wallet, more than it holds. Enter a smaller amount.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.changeText(amountField(), "60");
    expect(
      screen.getByText("Enter an amount greater than zero and within your available balance."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("reviews the exact total, moves the money and reads its arrival back", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain);
    const { handlers } = await openFund(chain);
    await fireEvent.press(screen.getByRole("button", { name: "100" }));
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));

    expect(
      screen.getByText(
        "Review what leaves your funding wallet before moving money into Investing.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Privacy fee (0.1%)")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Total leaving your funding wallet, 100 point 30 USDC"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("If the transfer would take more than this total, it is not signed."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Move privately" }));
    expect(await screen.findByText("Funds arrived", undefined, ARRIVAL_WAIT)).toBeOnTheScreen();
    expect(
      screen.getByText(
        "100.00 USDC is now in Investing, read back from its real balance. 0.30 USDC in fees was charged on top.",
      ),
    ).toBeOnTheScreen();
    expect(chain.calls).toEqual([
      { kind: "private", amount: 100, to: wallet.portfolios[0].address },
    ]);

    await fireEvent.press(screen.getByRole("button", { name: "See public view" }));
    expect(handlers.onSeePublicView).toHaveBeenCalledWith(wallet.portfolios[0].id);
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(handlers.onClose).toHaveBeenCalled();
  }, 15_000);

  it("says when the outcome is unknown, and blocks funding again until it settles", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.privateTransfer = "unknown";
    await walletWith(chain);
    await openFund(chain);
    await fireEvent.changeText(amountField(), "25");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    await fireEvent.press(screen.getByRole("button", { name: "Move privately" }));

    expect(await screen.findByText("Sent, but not confirmed")).toBeOnTheScreen();
    expect(screen.getByText("Close")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(getSnapshot()!.funding.pendingAction).toBeDefined();

    screen.unmount();
    await openFund(chain);
    await fireEvent.changeText(amountField(), "10");
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
    expect(
      await screen.findByText(
        /Your last move of money from the funding wallet .* is not confirmed yet/,
      ),
    ).toBeOnTheScreen();
    expect(chain.calls).toHaveLength(1);
  });

  it("returns to the amount with the refusal when nothing was sent", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.privateTransfer = "refused";
    await walletWith(chain);
    await openFund(chain);
    await fireEvent.changeText(amountField(), "10");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    await fireEvent.press(screen.getByRole("button", { name: "Move privately" }));
    expect(
      await screen.findByText(
        "This transfer would name one of your portfolios on chain next to your funding wallet. Not signed.",
      ),
    ).toBeOnTheScreen();
    expect(amountField()).toHaveDisplayValue("10");
    expect(getSnapshot()!.funding.pendingAction).toBeUndefined();
  });

  it("offers the funding address when the funding wallet is empty", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain, { funding: 0 });
    const onAddMoney = jest.fn();
    await renderWithMoney(
      await testServices(),
      testMoney(chain),
      <FundScreen
        portfolioId={getSnapshot()!.portfolios[0].id}
        onClose={jest.fn()}
        onAddMoney={onAddMoney}
        onSeePublicView={jest.fn()}
      />,
    );
    expect(await screen.findByText("Your funding wallet is empty.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Amount in USDC")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Add money" }));
    expect(onAddMoney).toHaveBeenCalled();
  });

  it("starts with a choice of portfolio when opened for none", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain, {
      portfolios: [
        { label: "Investing", cash: 10 },
        { label: "Long term", cash: 312.4 },
      ],
    });
    const money = testMoney(chain);
    await renderWithMoney(
      await testServices(),
      money,
      <FundScreen
        portfolioId={null}
        onClose={jest.fn()}
        onAddMoney={jest.fn()}
        onSeePublicView={jest.fn()}
      />,
    );
    expect(await screen.findByText("Choose a portfolio")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await fireEvent.press(
      screen.getByRole("radio", { name: "Long term, 312.40 USDC ready to invest" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue with Long term" }));
    expect(
      screen.getByText(
        "Move USDC into Long term without publishing a transfer between your funding wallet and it.",
      ),
    ).toBeOnTheScreen();
  });

  it("disables Review and says why while offline", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openFund(chain, { online: false });
    await fireEvent.changeText(amountField(), "10");
    expect(screen.getByText(/You're offline\./)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("keeps the record of an unsettled transfer until the chain settles it", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.privateTransfer = "unknown";
    await walletWith(chain);
    const { money } = await openFund(chain);
    await fireEvent.changeText(amountField(), "10");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    await fireEvent.press(screen.getByRole("button", { name: "Move privately" }));
    await screen.findByText("Sent, but not confirmed");
    chain.settles = "landed";
    await act(async () => {
      await money.pending.settlePending(FUNDING);
    });
    await waitFor(() => expect(getSnapshot()!.funding.pendingAction).toBeUndefined());
  });

  it("refuses an amount with more decimals than USDC has, and says the smallest amount", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openFund(chain);
    expect(screen.queryByRole("alert")).toBeNull();
    await fireEvent.changeText(amountField(), "10.1234567");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That amount has too many decimals. The smallest amount is 0.000001 USDC.",
    );
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("stops holding the sheet when a transfer never answers, without claiming it failed", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.beforeSigning = () => new Promise(() => undefined);
    await walletWith(chain);
    const { handlers } = await openFund(chain);
    await fireEvent.changeText(amountField(), "100");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    jest.useFakeTimers();
    await fireEvent.press(screen.getByRole("button", { name: "Move privately" }));
    await act(() => jest.advanceTimersByTimeAsync(STILL_WORKING_AFTER_MS.action));
    expect(
      screen.getByText("Still working. You can leave this open; nothing more is needed from you."),
    ).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(WAIT_LIMIT_MS.action));
    expect(
      screen.getByText(
        "This is taking longer than it should. It may still go through, so check the balance and Activity before doing it again.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Close" }).at(-1)!);
    expect(handlers.onClose).toHaveBeenCalled();
    jest.useRealTimers();
  }, 30_000);
});
