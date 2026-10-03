import { createWallet, storeNewWallet } from "@noirwire/shared/wallet";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { STRONG_PASSWORD, forgetWallet, installTestPlatform } from "../testServices";
import * as walletActions from "../wallet/walletActions";
import { PHRASE_VISIBLE_MS, RecoveryPhraseScreen } from "./RecoveryPhraseScreen";

afterEach(() => forgetWallet());

async function setup() {
  installTestPlatform();
  const draft = createWallet();
  await storeNewWallet(draft.wallet, draft.phrase, STRONG_PASSWORD);
  await render(<RecoveryPhraseScreen />);
  return draft;
}

const field = () => screen.getByLabelText("Enter your password to show it");

describe("RecoveryPhraseScreen", () => {
  it("needs the password every time, and says when it is wrong", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Show" })).toBeDisabled();
    await fireEvent.changeText(field(), "wrong password");
    await fireEvent.press(screen.getByRole("button", { name: "Show" }));
    expect(await screen.findByText("That password does not match this wallet.")).toBeOnTheScreen();
    expect(field().props.value).toBe("");
  });

  it("shows the phrase for the right password, without a Copy, and hides it on request", async () => {
    const draft = await setup();
    await fireEvent.changeText(field(), STRONG_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: "Show" }));
    expect(await screen.findByLabelText(`Word 1, ${draft.phrase[0]}`)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Hide phrase" }));
    expect(screen.queryByLabelText(`Word 1, ${draft.phrase[0]}`)).toBeNull();
  });

  it("hides the phrase by itself after a minute", async () => {
    const words = (await setup()).phrase;
    // Under fake timers the real key derivation would outlast the wait, so the check answers at once.
    jest.spyOn(walletActions, "revealPhrase").mockResolvedValue(words);
    jest.useFakeTimers();
    try {
      await fireEvent.changeText(field(), STRONG_PASSWORD);
      await fireEvent.press(screen.getByRole("button", { name: "Show" }));
      expect(screen.getByLabelText(`Word 1, ${words[0]}`)).toBeOnTheScreen();
      await act(() => jest.advanceTimersByTime(PHRASE_VISIBLE_MS - 1));
      expect(screen.getByLabelText(`Word 1, ${words[0]}`)).toBeOnTheScreen();
      await act(() => jest.advanceTimersByTime(1));
      expect(screen.queryByLabelText(`Word 1, ${words[0]}`)).toBeNull();
    } finally {
      jest.useRealTimers();
      jest.restoreAllMocks();
    }
  });
});
