/**
 * Markets and tracker strings the phone needs that the shared copy lacks, or
 * words for a browser. Candidates to move into @noirwire/shared/copy as a
 * mobile variant.
 */
export const mobileMarketsCopy = {
  title: "Markets",
  searchLabel: "Search trackers",
  clearSearch: "Clear search",
  showMore: (remaining: number, page: number) =>
    remaining > page ? `Show ${page} more` : `Show ${remaining} more`,
  watchlistEmpty: "Your watchlist is empty.",
  watchlistEmptyDetail: "Tap the star on a tracker to save it here.",
  rowLabel: (name: string, symbol: string, price: string | null, change: string | null) =>
    [name, symbol, price ?? "no live price", change].filter(Boolean).join(", "),
  changeSpoken: (percent: number) =>
    Math.abs(percent) < 0.005
      ? "unchanged today"
      : `${percent > 0 ? "up" : "down"} ${Math.abs(percent).toFixed(2)} percent today`,
  backToWelcome: "Back",

  detail: {
    indicative: "Indicative",
    liveNote: "Your order price is confirmed at review.",
    rangeLabel: "Chart range",
    rangeName: { "1D": "1 day", "1W": "1 week", "1M": "1 month" } as const,
    chartLabel: (range: string, from: string, to: string, change: string) =>
      `${range} price chart. Started at ${from}, now ${to}, ${change}.`,
    backToMarkets: "Back to Markets",
    aboutAndRisk: "About and risk",
    dividends:
      "Dividends are not paid out in cash. The issuer reinvests them by raising a multiplier on the token, so the balance shown here grows instead. Splits change the balance the same way.",
    readRisks: "Read the risks",
    createPortfolio: "Create a portfolio",
    offline: "You're offline. Nothing can be bought or sold until you're back online.",
    holdingRow: (label: string, quantity: string) => `${label} · ${quantity}`,
  },
} as const;
