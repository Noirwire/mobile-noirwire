import { walletCopy } from "@noirwire/shared/copy";
import { isWrongPassword, unlockProblemText } from "./copy";

describe("unlockProblemText", () => {
  it("says what the store reports in the phone's words where the shared copy names a browser", () => {
    expect(unlockProblemText(walletCopy.store.damaged)).toBe(
      "The wallet stored on this phone cannot be read. Reset it and import it again from your recovery phrase.",
    );
    expect(unlockProblemText(walletCopy.store.addressMismatch)).toBe(
      walletCopy.store.addressMismatch,
    );
    expect(isWrongPassword(walletCopy.store.wrongPassword)).toBe(true);
  });
});
