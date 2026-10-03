/**
 * Which screens may show for the wallet's state (spec 1.5 and 3.4): no
 * wallet opens onboarding, a stored and locked wallet opens Unlock, and only
 * an unlocked wallet reaches the tabs.
 */

export type WalletState = { exists: boolean | undefined; unlocked: boolean };

export type Place =
  | "onboarding"
  /** Set password and the biometric offer, which finish while the new wallet is already unlocked. */
  | "finishing"
  | "visitor"
  | "unlock"
  | "reset"
  | "dev"
  | "app";

export const WELCOME = "/welcome";
export const UNLOCK = "/unlock";
export const HOME = "/";

const FINISHING = new Set(["set-password", "biometric"]);

export function placeOf(segments: readonly string[]): Place {
  const [first, second] = segments;
  if (first === "(onboarding)") return second && FINISHING.has(second) ? "finishing" : "onboarding";
  if (first === "(visitor)") return "visitor";
  if (first === "unlock") return "unlock";
  if (first === "reset") return "reset";
  if (first === "dev") return "dev";
  return "app";
}

/** Where to go instead, or null to stay. `resume` is the screen an unlocked wallet was on before it locked. */
export function gateRedirect(
  state: WalletState,
  place: Place,
  resume: string | null,
): string | null {
  if (state.exists === undefined || place === "dev") return null;
  if (!state.exists) {
    return place === "onboarding" || place === "finishing" || place === "visitor" ? null : WELCOME;
  }
  if (!state.unlocked) return place === "unlock" || place === "reset" ? null : UNLOCK;
  if (place === "app" || place === "finishing") return null;
  return place === "unlock" ? (resume ?? HOME) : HOME;
}
