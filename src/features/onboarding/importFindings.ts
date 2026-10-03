import { onboardingCopy, plural } from "@noirwire/shared/copy";
import type { DerivationScheme } from "@noirwire/shared/domain";
import type { ImportResolution, SchemeActivity } from "@noirwire/shared/infrastructure";
import { mobileOnboardingCopy } from "./copy";

/**
 * The view model of "Where did this phrase come from?" and of the import
 * result (spec 2.6, 2.7): what each set of addresses was found to hold, in
 * words, and never an address. A candidate to move into
 * @noirwire/shared/presentation.
 */

export type SourceChoice = "app" | "walletDefault" | "notSure";

/** The scheme the most other wallets use, opened when the chain cannot decide. */
const MOST_WALLETS: DerivationScheme = "walletDefault";

const copy = mobileOnboardingCopy.source;

/**
 * Token balances: anything at the funding address. A set whose only sign of
 * use is a portfolio found further along shows no funding balance.
 */
function heldTokens(activity: SchemeActivity): boolean {
  return activity.balanceSol > 0 || (activity.active && activity.portfolios.length === 0);
}

export function foundText(activity: SchemeActivity): string {
  const portfolios = activity.portfolios.length;
  const tokens = heldTokens(activity);
  if (portfolios > 0 && tokens) return `${plural(portfolios, "portfolio")} and token balances`;
  if (portfolios > 0) return plural(portfolios, "portfolio");
  if (tokens) return copy.tokenBalances;
  return copy.nothingFound;
}

export function schemeFor(choice: SourceChoice, resolution: ImportResolution): DerivationScheme {
  return choice === "notSure" ? (resolution.scheme ?? MOST_WALLETS) : choice;
}

export type SourceOption = {
  choice: SourceChoice;
  title: string;
  captions: { text: string; tone: "dim" | "faint" | "safe" }[];
};

export type SourceView = {
  options: SourceOption[];
  /** Preselected when exactly one set shows anything on chain. */
  preselected: SourceChoice | null;
};

export function sourceView(resolution: ImportResolution): SourceView {
  const usedMark = (scheme: DerivationScheme) =>
    resolution.scheme === scheme ? [{ text: copy.used, tone: "safe" as const }] : [];
  return {
    preselected: resolution.scheme,
    options: [
      {
        choice: "app",
        title: copy.noirwire,
        captions: [{ text: foundText(resolution.app), tone: "dim" }, ...usedMark("app")],
      },
      {
        choice: "walletDefault",
        title: copy.otherWallet,
        captions: [
          { text: copy.otherWalletExamples, tone: "faint" },
          { text: foundText(resolution.walletDefault), tone: "dim" },
          ...usedMark("walletDefault"),
        ],
      },
      {
        choice: "notSure",
        title: copy.notSure,
        captions: [
          { text: resolution.scheme ? copy.opensUsed : copy.opensMostWallets, tone: "dim" },
        ],
      },
    ],
  };
}

export type ResultView = { title: string; body: string; found: boolean };

export function resultView(activity: SchemeActivity): ResultView {
  const portfolios = activity.portfolios.length;
  const result = mobileOnboardingCopy.result;
  if (!activity.active)
    return { title: onboardingCopy.import.importedTitle, body: result.nothing, found: false };
  return {
    title: onboardingCopy.import.reunitedTitle,
    body: portfolios > 0 ? result.found(plural(portfolios, "portfolio")) : result.foundBalances,
    found: true,
  };
}

/** An address in groups of four characters, as it is shown and read once the user asks for it. */
export function groupsOfFour(address: string): string[] {
  return address.match(/.{1,4}/g) ?? [];
}
