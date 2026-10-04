import type { NetworkCheck } from "@noirwire/shared/application";
import { appCopy, mobileAppCopy } from "@noirwire/shared/copy";
import { unreachableView } from "@noirwire/shared/presentation";

export type GateState = "checking" | NetworkCheck;

type GateView = {
  /** Null while checking: the splash shows only the mark. */
  message: string | null;
  /** Shown under the mark once the check has taken longer than a moment. */
  caption: string | null;
  retry: string | null;
  /** The stored wallet can still be unlocked: the unlock screen shows, with the message as a notice on it. */
  unlockOffered: boolean;
};

/** What the gate says for its state (spec 2.0). `wallet` is what the device stores, which chooses the words. */
export function networkGateView(
  state: Exclude<GateState, "ok">,
  network: string,
  slow: boolean,
  wallet: { hasWallet: boolean; locked: boolean },
): GateView {
  switch (state) {
    case "checking":
      return {
        message: null,
        caption: slow ? mobileAppCopy.network.checking : null,
        retry: null,
        unlockOffered: false,
      };
    case "wrongNetwork":
      return {
        message: appCopy.networkGate.wrongNetwork(network),
        caption: null,
        retry: null,
        unlockOffered: false,
      };
    case "unreachable": {
      const view = unreachableView(wallet);
      return {
        message: view.message,
        caption: null,
        retry: view.retry,
        unlockOffered: view.unlockOffered,
      };
    }
  }
}
