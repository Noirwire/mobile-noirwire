import { plural } from "@noirwire/shared/copy";

/**
 * Home strings the phone needs that the shared copy lacks, or words with
 * "stocks" where the phone says "trackers". Candidates to move into
 * @noirwire/shared/copy as a mobile variant.
 */
export const mobileHomeCopy = {
  heldTrackersDay: (delta: string) => `${delta} held trackers · 24h indicative`,
  togetherOnlyHere: "Shown together only here",
  togetherExplained:
    "This total is added up on this phone. Nothing on chain ties your portfolios to each other or to your funding wallet, and NoirWire's server never receives the sum.",
  cashAvailable: "Cash available to invest",
  earningUnavailable: "Unavailable",
  findTrackers: "Find trackers",
  addMoney: "Add money",
  addUsdc: "Add USDC",
  showFundingAddress: "Show funding address",
  howToAddMoney: "How to add money",
  lookAtTrackers: "Look at trackers first",
  newPortfolioLabel: "New portfolio",
  portfolioLine: {
    holdings: (cash: string, count: number) => `${cash} cash · ${plural(count, "holding")}`,
    pie: (count: number, cash: string) => `Pie · ${plural(count, "tracker")} · ${cash} cash`,
  },
  archived: (count: number) => `Archived portfolios (${count})`,
  restored: "Restored.",
  restoreLabel: (name: string) => `Restore ${name}`,
  noInvestments: "No investments yet. Find a company or index tracker to get started.",
  tokens: (symbol: string, amount: string) => `${symbol} · ${amount} tokens`,
  refreshFailed: "Could not refresh. Pull down to try again.",
} as const;
