import { appCopy, mobileAppCopy } from "@noirwire/shared/copy";

export type NetworkCheck = "ok" | "wrongNetwork" | "unreachable";

export type GateState = "checking" | NetworkCheck;

/**
 * Which chain the RPC serves, by its genesis hash. A URL is only a claim;
 * the genesis hash cannot lie, so a build pointed at another network never
 * gets as far as showing a balance or a signing button. Anything that stops
 * the answer is the same as no answer.
 */
export async function checkNetwork(
  genesisHash: () => Promise<string>,
  expected: string,
): Promise<NetworkCheck> {
  try {
    return (await genesisHash()) === expected ? "ok" : "wrongNetwork";
  } catch {
    return "unreachable";
  }
}

type GateView = {
  /** Null while checking: the splash shows only the mark. */
  message: string | null;
  /** Shown under the mark once the check has taken longer than a moment. */
  caption: string | null;
  retry: string | null;
};

/** What the gate screen says for its state (spec 2.0). */
export function networkGateView(
  state: Exclude<GateState, "ok">,
  network: string,
  slow: boolean,
): GateView {
  switch (state) {
    case "checking":
      return { message: null, caption: slow ? mobileAppCopy.network.checking : null, retry: null };
    case "wrongNetwork":
      return { message: appCopy.networkGate.wrongNetwork(network), caption: null, retry: null };
    case "unreachable":
      return {
        message: appCopy.networkGate.unreachable,
        caption: null,
        retry: appCopy.networkGate.retry,
      };
  }
}
