import { walletCopy } from "@noirwire/shared/copy";

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Unlock strings the phone says differently from the shared copy, which
 * speaks of "this page" and "this browser". Candidates to move into
 * @noirwire/shared/copy as a mobile variant.
 */
export const mobileUnlockCopy = {
  lead: "Your wallet is stored encrypted on this phone, so it has to be unlocked each time the app opens.",
  forgotten:
    "Forgotten the password? It cannot be recovered. It never left this phone. Reset the wallet and import it again from your recovery phrase.",
  damaged:
    "The wallet stored on this phone cannot be read. Reset it and import it again from your recovery phrase.",
  noWallet: "There is no wallet on this phone.",
  use: (method: string) => `Use ${method}`,
  lockedOut: (method: string) =>
    `${sentence(method)} is unavailable right now. Enter your password.`,
  changed: (method: string) =>
    `${sentence(method)} settings changed on this phone, so it was turned off for NoirWire. Enter your password.`,
  prompt: "Unlock NoirWire",
} as const;

/**
 * The store answers in the shared copy's words; the phone shows its own where
 * those name a browser. Anything unrecognised is shown as the store wrote it.
 */
export function unlockProblemText(problem: string): string {
  const store = walletCopy.store;
  if (problem === store.damaged) return mobileUnlockCopy.damaged;
  if (problem === store.noWallet) return mobileUnlockCopy.noWallet;
  return problem;
}

/** Whether the problem is the wrong password, shown under the field rather than as a notice. */
export function isWrongPassword(problem: string): boolean {
  return problem === walletCopy.store.wrongPassword;
}
