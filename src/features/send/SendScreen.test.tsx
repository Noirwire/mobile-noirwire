import { WAIT_LIMIT_MS } from "@noirwire/shared/presentation";
import { getSnapshot } from "@noirwire/shared/wallet";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { useCameraPermissions } from "expo-camera";
import {
  fakeChain,
  renderWithMoney,
  testMoney,
  walletWith,
  type FakeChain,
} from "../network/testMoney";
import type { AppServices } from "../services";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { SendScreen } from "./SendScreen";

jest.mock("expo-camera", () => {
  const { View } = jest.requireActual("react-native");
  return {
    useCameraPermissions: jest.fn(),
    CameraView: (props: object) => <View testID="camera" {...props} />,
  };
});

afterEach(() => {
  jest.useRealTimers();
  return forgetWallet();
});

const someone = () => Keypair.generate().publicKey.toBase58();

async function openSend(chain: FakeChain, overrides: Partial<AppServices> = {}) {
  const handlers = { onClose: jest.fn(), onMoveMoney: jest.fn() };
  const money = testMoney(chain);
  await renderWithMoney(
    await testServices(overrides),
    money,
    <SendScreen portfolioId={getSnapshot()!.portfolios[0].id} {...handlers} />,
  );
  return { handlers, money };
}

const recipientField = () => screen.getByLabelText("Recipient address");
const amountField = () => screen.getByLabelText("Amount in USDC");

async function fillIn(to: string, amount: string) {
  await fireEvent.changeText(recipientField(), to);
  await fireEvent(recipientField(), "blur");
  await fireEvent.changeText(amountField(), amount);
  await fireEvent(amountField(), "blur");
}

async function toReview(to: string, amount: string) {
  await fillIn(to, amount);
  await fireEvent.press(screen.getByRole("button", { name: "Review" }));
  await screen.findByText("This cannot be undone.");
}

const sendButton = () => screen.getByRole("button", { name: "Send" });

describe("SendScreen", () => {
  it.each([
    [
      "mint",
      "This is a token's own mint address, not a wallet. Anything sent to it could not be moved again.",
    ],
    [
      "tokenAccount",
      "This is a token account, not a wallet. Send to the wallet address that owns it instead.",
    ],
    [
      "program",
      "This is a program's address, not a wallet. Anything sent to it could not be moved again.",
    ],
    [
      "programOwned",
      "This address is an account that a program controls, such as a stake account, not an ordinary wallet. Ask for the recipient's wallet address.",
    ],
  ] as const)("refuses a recipient that is a %s at Review", async (kind, message) => {
    installTestPlatform();
    const chain = fakeChain();
    chain.recipient = kind;
    await walletWith(chain);
    await openSend(chain);
    await fillIn(someone(), "10");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.queryByText("This cannot be undone.")).toBeNull();
    expect(chain.calls).toHaveLength(0);
  });

  it("refuses an address no key can sign for, a malformed one and the portfolio's own, before Review", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain);
    await openSend(chain);
    const [offCurve] = PublicKey.findProgramAddressSync([Buffer.from("seed")], PublicKey.default);

    await fillIn(offCurve.toBase58(), "10");
    expect(
      screen.getByText(
        "This address has no private key behind it: it is a token account or another address a program controls, not a wallet. Ask for the recipient's wallet address.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();

    await fillIn("not-an-address", "10");
    expect(screen.getByText("Enter a valid Solana address.")).toBeOnTheScreen();

    await fillIn(wallet.portfolios[0].address, "10");
    expect(
      screen.getByText("Choose an address other than this portfolio's own."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("warns about pasted text that cannot be part of an address", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openSend(chain, { readClipboard: async () => "0OIl not an address" });
    await fireEvent.press(screen.getByRole("button", { name: "Paste" }));
    expect(
      await screen.findByText(
        "Pasted text contains characters that cannot be part of an address. Check the address before continuing.",
      ),
    ).toBeOnTheScreen();
  });

  it("warns that sending to the funding wallet links the two, and holds Send until acknowledged", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain);
    await openSend(chain);
    await toReview(wallet.funding.address, "10");
    expect(await screen.findByText("This links the two addresses publicly.")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Anyone can then see that this portfolio and your funding wallet belong to the same person.",
      ),
    ).toBeOnTheScreen();
    expect(sendButton()).toBeDisabled();
    expect(
      screen.getByText("Confirm that you understand the link this creates."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("checkbox", { name: "I understand this links them" }));
    expect(sendButton()).toBeEnabled();
  });

  it("fills Max with the exact balance and sends it less exactly the reviewed network cost", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openSend(chain);
    const to = someone();
    await fireEvent.changeText(recipientField(), to);
    await fireEvent.press(screen.getByRole("button", { name: "Max" }));
    expect(amountField()).toHaveDisplayValue("457.33");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));

    expect(
      await screen.findByText(
        "0.02 USDC  from this portfolio pays the network cost, so 457.31 USDC is sent, not 457.33 USDC.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("457.31 USDC")).toBeOnTheScreen();
    expect(screen.getByText("0.02 USDC")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "First time sending to this address. Check every character against the source, not just the start and end.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Type the last 4 characters of the address.")).toBeOnTheScreen();
    expect(sendButton()).toBeDisabled();

    await fireEvent.changeText(
      screen.getByLabelText("Last 4 characters of recipient address"),
      to.slice(-4),
    );
    await fireEvent.press(sendButton());
    expect(await screen.findByText("Sent 457.31 USDC")).toBeOnTheScreen();
    expect(
      screen.getByText("To the address you entered. It has left Investing."),
    ).toBeOnTheScreen();
    expect(chain.calls).toEqual([{ kind: "send", amount: 457.31, to }]);
    // The recipient is kept with the entry, so Activity can show it again on request.
    expect(getSnapshot()!.activity[0]).toMatchObject({ kind: "send", counterparty: to });
  });

  it("says when the relayer cannot be used, and sends nothing", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.relayerFeeRaw = null;
    await walletWith(chain);
    await openSend(chain);
    await toReview(someone(), "10");
    expect(
      await screen.findByText(
        "This can't be done right now. Nothing was charged. Please try again in a few minutes.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Not available")).toBeOnTheScreen();
    expect(sendButton()).toBeDisabled();
  });

  it("offers to move money in when a send leaves too little cash for its cost", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.relayerFeeRaw = 20_000n;
    await walletWith(chain, { portfolios: [{ label: "Investing", cash: 0.01 }] });
    const { handlers } = await openSend(chain);
    await toReview(someone(), "0.005");
    expect(
      await screen.findByText(
        "This portfolio needs at least 0.02 USDC to pay the network cost, and would have 0.01 USDC to spare.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Move to portfolio" }));
    expect(handlers.onMoveMoney).toHaveBeenCalled();
  });

  it("reports an unknown outcome without a retry, and blocks the next send until it settles", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.relayed = "unknown";
    await walletWith(chain);
    await openSend(chain);
    await toReview(someone(), "25");
    await fireEvent.press(await screen.findByRole("button", { name: "Send" }));
    expect(await screen.findByText("Sent, but not confirmed")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "This was sent but could not be confirmed. It may still go through. Check Investing's balance before trying again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();

    screen.unmount();
    await openSend(chain);
    await toReview(someone(), "5");
    expect(
      await screen.findByText(/Your last action from this portfolio .* is not confirmed yet/),
    ).toBeOnTheScreen();
    expect(sendButton()).toBeDisabled();
    expect(chain.calls).toHaveLength(1);
  });

  it("returns to the review when the network cost rose, with nothing sent", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.relayed = "costRose";
    await walletWith(chain);
    await openSend(chain);
    await toReview(someone(), "10");
    await fireEvent.press(await screen.findByRole("button", { name: "Send" }));
    expect(
      await screen.findByText(
        "The network cost rose before this could be sent. Nothing was sent. Review the new network cost.",
      ),
    ).toBeOnTheScreen();
    expect(sendButton()).toBeOnTheScreen();
  });

  it("disables Review while offline", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openSend(chain, { useOnline: () => false });
    await fillIn(someone(), "10");
    expect(screen.getByText(/You're offline\./)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("says when the portfolio has nothing to send", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain, { portfolios: [{ label: "Investing", cash: 0 }] });
    await openSend(chain);
    expect(screen.getByText("This portfolio is empty.")).toBeOnTheScreen();
  });

  it("takes only the address from a scanned payment code", async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: true, canAskAgain: true, status: "granted" },
      jest.fn(),
    ]);
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    await openSend(chain);
    await fireEvent.press(screen.getByRole("button", { name: "Scan a QR code" }));
    const camera = screen.getByTestId("camera");
    await fireEvent(camera, "barcodeScanned", { data: "hello" });
    expect(screen.getByText("That code is not a Solana address.")).toBeOnTheScreen();

    const to = someone();
    await fireEvent(camera, "barcodeScanned", { data: `solana:${to}?amount=999&label=x` });
    expect(recipientField()).toHaveDisplayValue(to);
    expect(
      screen.getByText("Only the address was taken from this code. Enter the amount yourself."),
    ).toBeOnTheScreen();
    expect(amountField()).toHaveDisplayValue("");
  });

  it("says a landed send is sent when its new balance cannot be read back", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.unreadAfterAction = true;
    await walletWith(chain);
    await openSend(chain);
    await toReview(someone(), "25");
    await fireEvent.press(await screen.findByRole("button", { name: "Send" }));
    expect(await screen.findByText("Sent 25.00 USDC")).toBeOnTheScreen();
    expect(screen.getByText(/Balances will update shortly\.$/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Done" })).toBeOnTheScreen();
  });

  it("never leaves Review waiting: a check that does not answer ends, and the form is usable again", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    const { money } = await openSend(chain);
    money.sendChain.checkRecipient = () => new Promise(() => undefined);
    await fillIn(someone(), "10");
    jest.useFakeTimers();
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    await act(() => jest.advanceTimersByTimeAsync(WAIT_LIMIT_MS.review));
    expect(
      screen.getByText("We couldn't prepare your review. Nothing was sent. Try again."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Review" })).toBeEnabled();
    expect(chain.calls).toHaveLength(0);
  });

  it("says a technical failure of the review in plain words", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain);
    const { money } = await openSend(chain);
    money.sendChain.token = () => {
      throw new Error("502 Bad Gateway from /v1/relayer");
    };
    await fillIn(someone(), "10");
    await fireEvent.press(screen.getByRole("button", { name: "Review" }));
    expect(
      await screen.findByText("We couldn't prepare your review. Nothing was sent. Try again."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/502|Gateway|relayer/)).toBeNull();
  });

  it("stops holding the sheet when a send never answers, without claiming it failed", async () => {
    installTestPlatform();
    const chain = fakeChain();
    chain.beforeSigning = () => new Promise(() => undefined);
    await walletWith(chain);
    const { handlers } = await openSend(chain);
    await toReview(someone(), "25");
    jest.useFakeTimers();
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    await act(() => jest.advanceTimersByTimeAsync(WAIT_LIMIT_MS.action));
    expect(
      screen.getByText(
        "This is taking longer than it should. It may still go through, so check the balance and Activity before doing it again.",
      ),
    ).toBeOnTheScreen();
    // The sheet's own Close, after the scrim and the header's control, which work again too.
    await fireEvent.press(screen.getAllByRole("button", { name: "Close" }).at(-1)!);
    expect(handlers.onClose).toHaveBeenCalled();
  }, 30_000);
});
