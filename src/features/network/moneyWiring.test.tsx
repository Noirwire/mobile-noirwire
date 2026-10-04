import { FUNDING } from "@noirwire/shared/application";
import { errorsCopy, mobilePendingActionCopy } from "@noirwire/shared/copy";
import { ChainError } from "@noirwire/shared/domain";
import { unsignedTransaction } from "@noirwire/shared/testing";
import { getSnapshot, unlockedSession } from "@noirwire/shared/wallet";
import { Keypair } from "@solana/web3.js";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { FundScreen } from "../funding/FundScreen";
import { SendScreen } from "../send/SendScreen";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { installFakePrices } from "../trade/testDoubles";
import { TradeSheet } from "../trade/TradeSheet";
import {
  FAKE_SIGNATURE,
  fakeChain,
  renderWithMoney,
  signAsAClientWould,
  testMoney,
  walletWith,
  type FakeChain,
} from "./testMoney";
import { SETTLE_POLL_MS } from "./usePendingBlock";

jest.mock("expo-camera", () => ({ useCameraPermissions: jest.fn(), CameraView: () => null }));

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

const noop = () => undefined;

/** Holds every stand-in right before it signs, until the test lets it go on. */
function holdAtSigning(chain: FakeChain) {
  let release: () => void = noop;
  let reached: () => void = noop;
  const atSigning = new Promise<void>((resolve) => {
    reached = resolve;
  });
  chain.beforeSigning = () =>
    new Promise<void>((resolve) => {
      release = resolve;
      reached();
    });
  return { atSigning, release: () => release() };
}

/** Lets one whole settle poll of every mounted money screen go by. */
const onePoll = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, SETTLE_POLL_MS + 250)));

/** One portfolio with cash, and the trade sheet and one other money screen mounted over the same money wiring. */
async function mounted(other: "send" | "fund") {
  installTestPlatform();
  installFakePrices();
  const chain = fakeChain();
  const wallet = await walletWith(chain);
  const [portfolio] = wallet.portfolios;
  const money = testMoney(chain);
  await renderWithMoney(
    await testServices(),
    money,
    <>
      <TradeSheet
        side="buy"
        symbol="NVDAx"
        portfolioId={portfolio.id}
        onClose={noop}
        onAddMoney={noop}
      />
      {other === "send" ? (
        <SendScreen portfolioId={portfolio.id} onClose={noop} onMoveMoney={noop} />
      ) : (
        <FundScreen
          portfolioId={portfolio.id}
          onClose={noop}
          onShowFundingAddress={noop}
          onSeePublicView={noop}
        />
      )}
    </>,
  );
  await screen.findByLabelText("Spend $");
  return { chain, money, wallet, portfolio };
}

async function confirmSend(amount = "10") {
  const to = Keypair.generate().publicKey.toBase58();
  const recipient = screen.getByLabelText("Recipient address");
  await fireEvent.changeText(recipient, to);
  await fireEvent(recipient, "blur");
  await fireEvent.changeText(screen.getByLabelText("Amount in USDC"), amount);
  await fireEvent.press(screen.getByRole("button", { name: "Review" }));
  await screen.findByText("This cannot be undone.");
  await fireEvent.press(screen.getByRole("button", { name: "Send" }));
}

async function confirmFund() {
  const amount = (await screen.findAllByLabelText("Amount in USDC"))[0];
  await fireEvent.changeText(amount, "10");
  await fireEvent.press(screen.getByRole("button", { name: "Review" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Confirm" }));
}

const pendingOf = (id: string) =>
  getSnapshot()!.portfolios.find((portfolio) => portfolio.id === id)?.pendingAction;

describe("the one money wiring", () => {
  it("records a send's signature against the send's own reservation while a trade screen is mounted", async () => {
    const { chain, portfolio } = await mounted("send");
    chain.relayed = "unknown";
    const hold = holdAtSigning(chain);
    await confirmSend();
    await act(() => hold.atSigning);

    const reserved = pendingOf(portfolio.id);
    expect(reserved).toMatchObject({
      status: "reserved",
      what: expect.stringMatching(/^a send of/),
    });
    expect(reserved?.signature).toBeUndefined();

    await act(async () => hold.release());
    // Only the signing guard writes a blockhash into a reservation.
    await waitFor(() => expect(pendingOf(portfolio.id)?.blockhash).toBeDefined());
    expect(pendingOf(portfolio.id)).toMatchObject({
      id: reserved!.id,
      what: reserved!.what,
      blockhash: "11111111111111111111111111111111",
    });
    // The trade screen reads the same record: its Review is held back by the send's unsettled action.
    expect((await screen.findAllByText("Sent, but not confirmed")).length).toBeGreaterThan(0);
  });

  it("does not let the trade screen's settle poll release a send's live, unsigned reservation", async () => {
    const { chain, money, portfolio } = await mounted("send");
    const hold = holdAtSigning(chain);
    await confirmSend();
    await act(() => hold.atSigning);
    const reserved = pendingOf(portfolio.id);
    expect(reserved?.status).toBe("reserved");

    await onePoll();
    expect(await money.pending.settlePending(portfolio.id)).toBe("pending");
    expect(pendingOf(portfolio.id)).toEqual(reserved);

    await act(async () => hold.release());
    await waitFor(() => expect(pendingOf(portfolio.id)).toBeUndefined());
    expect(chain.calls.filter((call) => call.kind === "send")).toHaveLength(1);
  });

  it("does not let the trade screen's settle poll release a private funding's live, unsigned reservation", async () => {
    const { chain, money, portfolio } = await mounted("fund");
    const hold = holdAtSigning(chain);
    await confirmFund();
    await act(() => hold.atSigning);
    const reserved = getSnapshot()!.funding.pendingAction;
    expect(reserved?.status).toBe("reserved");

    await onePoll();
    expect(await money.pending.settlePending(FUNDING)).toBe("pending");
    expect(await money.pending.settlePending(portfolio.id)).toBe("none");
    expect(getSnapshot()!.funding.pendingAction).toEqual(reserved);

    await act(async () => hold.release());
    await waitFor(() => expect(chain.calls.some((call) => call.kind === "private")).toBe(true));
    await waitFor(() => expect(chain.balances.get(portfolio.address)?.USDC).toBeCloseTo(467.33), {
      timeout: 8_000,
    });
  });

  it("refuses to sign for a key with no reservation", async () => {
    const { chain, wallet } = await mounted("send");
    const session = unlockedSession();
    if ("refused" in session) throw new Error("The wallet is locked.");
    const signer = session.portfolioSigner(wallet.portfolios[0])!;
    const transaction = unsignedTransaction(signer);
    await expect(signAsAClientWould(chain, signer, () => true, transaction)).rejects.toEqual(
      new ChainError("notRecorded"),
    );
    expect(pendingOf(wallet.portfolios[0].id)).toBeUndefined();
  });

  it("says nothing was sent when a signature could not be written to its reservation", async () => {
    const { chain, money, portfolio } = await mounted("send");
    // A client that signs with a key other than the reserved portfolio's.
    const stranger = Keypair.generate();
    money.sendChain.asset = (symbol) => ({
      ...money.asset(symbol)!,
      sendRelayed: async ({ stillUnlocked }) => {
        await signAsAClientWould(chain, stranger, stillUnlocked);
        return FAKE_SIGNATURE;
      },
    });
    await confirmSend();
    expect(await screen.findByText(mobilePendingActionCopy.notRecorded)).toBeOnTheScreen();
    expect(pendingOf(portfolio.id)).toBeUndefined();
  });

  it("refuses before signing when the connection serves another chain", async () => {
    const { chain, money, wallet, portfolio } = await mounted("send");
    chain.genesisHash = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
    const session = unlockedSession();
    if ("refused" in session) throw new Error("The wallet is locked.");
    const signer = session.portfolioSigner(wallet.portfolios[0])!;
    const reservation = await act(() =>
      money.pending.reserve(portfolio.id, portfolio.address, "a test"),
    );
    const transaction = unsignedTransaction(signer);
    await expect(signAsAClientWould(chain, signer, () => true, transaction)).rejects.toEqual(
      new ChainError("wrongNetwork"),
    );
    expect(transaction.signatures[0].every((byte) => byte === 0)).toBe(true);
    expect(pendingOf(portfolio.id)).toMatchObject({ status: "reserved" });
    expect(pendingOf(portfolio.id)?.blockhash).toBeUndefined();
    await act(async () => reservation!.finish(new ChainError("wrongNetwork")));
    expect(pendingOf(portfolio.id)).toBeUndefined();
  });

  it("tells the person nothing was signed when a send meets the wrong chain", async () => {
    const { chain, portfolio } = await mounted("send");
    chain.genesisHash = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
    await confirmSend();
    expect(await screen.findByText(errorsCopy.chain.wrongNetwork)).toBeOnTheScreen();
    expect(pendingOf(portfolio.id)).toBeUndefined();
    expect(chain.balances.get(portfolio.address)?.USDC).toBe(457.33);
  });
});
