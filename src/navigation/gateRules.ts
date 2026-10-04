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

/**
 * The routes that are sheets over a screen. A lock dismisses a sheet and
 * discards what was typed in it, and no sheet reopens after an unlock.
 */
export const SHEET_ROUTES = [
  "trade",
  "send",
  "receive",
  "fund",
  "new-portfolio",
  "pie-builder",
  "pie-order",
] as const;

export type SheetRouteName = (typeof SHEET_ROUTES)[number];

const SHEETS: ReadonlySet<string> = new Set(SHEET_ROUTES);

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

/**
 * Whether an unlock may come back to this screen: a tab or a stack screen of
 * the unlocked app, never a sheet.
 */
export function resumesAfterUnlock(segments: readonly string[]): boolean {
  return placeOf(segments) === "app" && !SHEETS.has(segments[0] ?? "");
}

/**
 * Where to go instead, or null to stay. `resume` is the screen an unlocked
 * wallet was on before it locked, or the link that arrived while it was
 * locked. `visitor` is what the path asked for opens with no wallet stored:
 * the two markets links, as a visitor sees them (spec 1.4).
 */
export function gateRedirect(
  state: WalletState,
  place: Place,
  resume: string | null,
  visitor: string | null = null,
): string | null {
  if (state.exists === undefined || place === "dev") return null;
  if (!state.exists) {
    if (place === "onboarding" || place === "finishing" || place === "visitor") return null;
    return place === "app" && visitor ? visitor : WELCOME;
  }
  if (!state.unlocked) return place === "unlock" || place === "reset" ? null : UNLOCK;
  if (place === "app" || place === "finishing") return null;
  return place === "unlock" ? (resume ?? HOME) : HOME;
}
