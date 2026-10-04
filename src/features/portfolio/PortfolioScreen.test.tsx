import type { Portfolio } from "@noirwire/shared/domain";
import { getSnapshot, updateWallet } from "@noirwire/shared/wallet";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { copySecret } from "@/ui/secretClipboard";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { fakeChain, type FakeChain } from "../network/testMoney";
import { PortfolioScreen } from "./PortfolioScreen";
import {
  activity,
  fakeBalances,
  holding,
  renderScreen,
  seedLivePrices,
  unlockedWallet,
  withHolding,
} from "./testWallet";

jest.mock("@/ui/secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

let updatedAt: number;

beforeEach(async () => {
  installTestPlatform();
  updatedAt ??= await seedLivePrices();
});
afterEach(() => forgetWallet());

async function walletWith(shape: (first: Portfolio) => Portfolio) {
  const wallet = await unlockedWallet((w) => ({
    ...w,
    portfolios: [shape({ ...w.portfolios[0], label: "Investing" })],
  }));
  return wallet.portfolios[0];
}

async function show(
  id: string,
  overrides: {
    online?: boolean;
    initialPublic?: boolean;
    readsFail?: boolean;
    chain?: FakeChain;
  } = {},
) {
  const on = {
    onAction: jest.fn(),
    onBack: jest.fn(),
    onOpenPortfolio: jest.fn(),
    onSeeAllActivity: jest.fn(),
  };
  const balances = fakeBalances(!overrides.readsFail, overrides.chain);
  await renderScreen(
    await testServices({ useOnline: () => overrides.online ?? true }),
    <PortfolioScreen
      {...on}
      id={id}
      backLabel="Home"
      pricesUpdatedAt={updatedAt}
      initialPublic={overrides.initialPublic}
    />,
    balances,
  );
  return { on, balances };
}

const invested = (p: Portfolio) =>
  withHolding(withHolding(p, holding("USDC", 457.33)), holding("NVDAx", 5.1075));

describe("PortfolioScreen", () => {
  it("shows the value, cash, actions and holdings, and reads this portfolio again", async () => {
    const portfolio = await walletWith(invested);
    const { on, balances } = await show(portfolio.id);
    expect(screen.getByText("Investing")).toBeOnTheScreen();
    expect(screen.getByLabelText("Portfolio value, $968.08")).toBeOnTheScreen();
    expect(screen.getByText("457.33 USDC ready to invest")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Buy a tracker" }));
    expect(on.onAction).toHaveBeenLastCalledWith({ to: "buy" });
    await fireEvent.press(screen.getByRole("button", { name: "Move to portfolio" }));
    expect(on.onAction).toHaveBeenLastCalledWith({ to: "fund" });
    await fireEvent.press(screen.getByRole("button", { name: "Receive" }));
    expect(on.onAction).toHaveBeenLastCalledWith({ to: "receive" });
    await fireEvent.press(screen.getByRole("button", { name: "Sell NVIDIA tracker" }));
    expect(on.onAction).toHaveBeenLastCalledWith({ to: "sell", symbol: "NVDAx" });
    await fireEvent.press(
      screen.getByRole("button", { name: "NVIDIA tracker, 5.1075 NVDAx, $510.75" }),
    );
    expect(on.onAction).toHaveBeenLastCalledWith({ to: "tracker", symbol: "NVDAx" });
    await fireEvent.press(screen.getByRole("button", { name: "Home" }));
    expect(on.onBack).toHaveBeenCalled();
    await waitFor(() => expect(balances.calls).toEqual([`portfolio:${portfolio.id}`]));
  });

  it("counts what the portfolio has in Earn in its value, and says how much that is", async () => {
    const portfolio = await walletWith(invested);
    const chain = fakeChain();
    chain.earn.deposited.set(portfolio.address, 25);
    await show(portfolio.id, { chain });
    expect(await screen.findByLabelText("Portfolio value, $993.08")).toBeOnTheScreen();
    expect(screen.getByText("Earning $25.00")).toBeOnTheScreen();
  });

  it("says when what is in Earn cannot be read, and counts only what it holds", async () => {
    const portfolio = await walletWith(invested);
    const chain = fakeChain();
    chain.earn.unreadable.add(portfolio.address);
    await show(portfolio.id, { chain });
    expect(await screen.findByText("Earning Unavailable")).toBeOnTheScreen();
    expect(screen.getByLabelText("Portfolio value, $968.08")).toBeOnTheScreen();
  });

  it("leads an empty portfolio with moving money in, and says why Send waits", async () => {
    const portfolio = await walletWith((p) => p);
    const { on } = await show(portfolio.id);
    expect(screen.getByText("Nothing here yet.")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Move to portfolio" })).toHaveLength(1);
    expect(screen.getByText("Move money in first, then choose a tracker.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    // The reason sits in Send's own column, under Send, and not under Receive.
    const reason = screen.getByText("Nothing to send yet.");
    expect(within(reason.parent!).getByRole("button", { name: "Send" })).toBeOnTheScreen();
    expect(within(reason.parent!).queryByRole("button", { name: "Receive" })).toBeNull();
    expect(
      screen.getByText("Nothing has moved yet. Move money into this portfolio to begin."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Move to portfolio" }));
    expect(on.onAction).toHaveBeenCalledWith({ to: "fund" });
  });

  it("disables every action while offline", async () => {
    const portfolio = await walletWith(invested);
    const { balances } = await show(portfolio.id, { online: false });
    for (const name of [
      "Buy a tracker",
      "Receive",
      "Send",
      "Move to portfolio",
      "Sell NVIDIA tracker",
    ]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "See public view" })).toBeEnabled();
    expect(balances.calls).toEqual([]);
  });

  it("opens public view from its button: tickers and amounts, the address behind Show", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const portfolio = await walletWith((p) => invested(p));
    await act(async () => undefined);
    await show(portfolio.id);
    await fireEvent.press(screen.getByRole("button", { name: "See public view" }));
    expect(announce).toHaveBeenCalledWith(
      "Public view. Showing what someone with this address can see, as far as this phone knows.",
    );
    expect(screen.getByText("Public view")).toBeOnTheScreen();
    expect(screen.getByText("5.1075 NVDAx")).toBeOnTheScreen();
    expect(screen.getByText("Hidden")).toBeOnTheScreen();
    expect(screen.queryByText(portfolio.address, { exact: false })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Show this portfolio's address" }));
    const first = portfolio.address.slice(0, 4);
    expect(screen.getByText(new RegExp(`^${first} `))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Copy this portfolio's address" }));
    expect(copySecret).toHaveBeenCalledWith(portfolio.address);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Back to my view" }));
    await waitFor(() => expect(screen.queryByText("Public view")).toBeNull());
  });

  it("enters public view while the mark is held, and leaves it on release", async () => {
    const portfolio = await walletWith(invested);
    await show(portfolio.id);
    const mark = screen.getByLabelText("Investing", { exact: true });
    await fireEvent(mark, "longPress");
    expect(screen.getByText("Public view")).toBeOnTheScreen();
    await fireEvent(mark, "pressOut");
    await waitFor(() => expect(screen.queryByText("Public view")).toBeNull());
  });

  it("offers public view as the mark's own accessibility action", async () => {
    const portfolio = await walletWith(invested);
    await show(portfolio.id);
    await fireEvent(screen.getByLabelText("Investing", { exact: true }), "accessibilityAction", {
      nativeEvent: { actionName: "publicView" },
    });
    expect(screen.getByText("Public view")).toBeOnTheScreen();
  });

  it("can open straight into public view", async () => {
    const portfolio = await walletWith(invested);
    await show(portfolio.id, { initialPublic: true });
    expect(screen.getByText("Public view")).toBeOnTheScreen();
  });

  it("restores an archived portfolio from its notice", async () => {
    const portfolio = await walletWith((p) => ({ ...invested(p), archivedAt: 1 }));
    await show(portfolio.id);
    expect(screen.getByText("This portfolio is archived.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Sell NVIDIA tracker" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(getSnapshot()!.portfolios[0].archivedAt).toBeNull());
    expect(await screen.findByRole("button", { name: "Buy a tracker" })).toBeOnTheScreen();
  });

  it("says a stale route's portfolio does not exist", async () => {
    await walletWith((p) => p);
    const { on } = await show("gone");
    expect(screen.getByText("That portfolio does not exist.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Back to Home" }));
    expect(on.onBack).toHaveBeenCalled();
  });

  it("renames, re-marks and archives from Portfolio settings", async () => {
    const portfolio = await walletWith(invested);
    await show(portfolio.id);
    await fireEvent.press(screen.getByRole("button", { name: "Portfolio settings" }));
    const save = () => screen.getByRole("button", { name: "Save" });
    expect(save()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "  Long term ");
    await fireEvent.press(screen.getByRole("button", { name: "Change Icon and colour" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Teal colour" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Goal icon" }));
    await fireEvent.press(save());
    await waitFor(() =>
      expect(getSnapshot()!.portfolios[0]).toMatchObject({
        label: "Long term",
        icon: { glyph: "target", tint: "teal" },
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Portfolio settings" }));
    expect(
      screen.getByText(
        "This portfolio still holds $968.08. Archiving hides it; it does not move anything.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(getSnapshot()!.portfolios[0].archivedAt).not.toBeNull());
  });

  it("lists this portfolio's recent activity and opens an entry", async () => {
    const portfolio = await walletWith(invested);
    await act(async () => {
      const { updateWallet } = await import("@noirwire/shared/wallet");
      await updateWallet((w) => ({
        ...w,
        activity: [activity({ portfolioId: portfolio.id, kind: "fund", usd: 100 })],
      }));
    });
    const { on } = await show(portfolio.id);
    await fireEvent.press(screen.getByRole("button", { name: /^Money arrived, Investing/ }));
    expect(await screen.findByText("Value at the time")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "See all" }));
    expect(on.onSeeAllActivity).toHaveBeenCalled();
  });

  it("refuses a new name another portfolio already has", async () => {
    const portfolio = await walletWith(invested);
    await updateWallet((wallet) => ({
      ...wallet,
      portfolios: [
        ...wallet.portfolios,
        { ...wallet.portfolios[0], id: "other", label: "Trips", archivedAt: 1 },
      ],
    }));
    await show(portfolio.id);
    await fireEvent.press(screen.getByRole("button", { name: "Portfolio settings" }));
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "trips");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You already have a portfolio with that name. Choose another name.",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "Trips 2");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("says what may be out of date after a failed read, and asks again on Try again", async () => {
    const portfolio = await walletWith(invested);
    const { balances } = await show(portfolio.id, { readsFail: true });
    expect(
      await screen.findByText(
        "We couldn't update your balances. What you see may be out of date. Pull down to try again.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(balances.calls).toHaveLength(2));
  });
});
