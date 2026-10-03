import { plural } from "@noirwire/shared/copy";

/**
 * Pie strings in the phone's vocabulary. The shared pie copy still says
 * "stocks" where the phone says "trackers"; these are candidates to move into
 * @noirwire/shared/copy and replace those.
 */
export const mobilePieCopy = {
  problems: {
    empty: "Add at least one tracker.",
    tooMany: (max: number) => `A pie holds at most ${max} trackers.`,
    repeated: "Each tracker can appear once.",
    unlisted: "Only listed trackers can be added.",
    retired: (symbol: string) => `${symbol} is no longer offered to buy. Remove it from the mix.`,
    weight: "Every tracker needs at least 1%.",
    total: (total: number) => `The mix adds up to ${total}%. It needs to be 100%.`,
  },
  builder: {
    addAnother: "Add another tracker",
    pickTrackers: "Pick the trackers for this pie",
    ringLabel: (count: number, slices: string) =>
      count === 0 ? "No trackers yet" : `${plural(count, "tracker")}: ${slices}`,
    sliceSpoken: (symbol: string, weight: number) => `${symbol} ${weight} percent`,
    totalSpoken: (total: number, caption: string) => `${total} percent, ${caption}`,
    saveFailed: "The mix could not be saved on this phone. Nothing was changed. Try again.",
  },
  order: {
    floor: (amount: string) =>
      `With this mix, invest at least about ${amount} right now so every order can be placed. This figure is approximate and depends on live prices.`,
    useAmount: (amount: string) => `Use ${amount}`,
    noCash: "This pie has no cash to invest.",
    noCashDetail: "Move money into this pie first.",
    addMoney: "Add money",
    smallerLeftAlone: "Smaller differences are left as they are.",
    trackersLine: "These are trackers, not shares, and their issuer keeps control over them.",
    readRisks: "Read the risks",
    risksTitle: "Risks",
    publicLine: "This portfolio's trades and holdings are public.",
    holdingsOpen: "The holdings are open. The network cost for that is already paid.",
    holdingsOpenFailed:
      "The holdings are open. The network cost for that is already paid and cannot be returned.",
    openingHoldings: "Opening the holdings...",
    pricingTitle: "Getting prices",
    resultTitle: "Orders",
    offline: "You're offline. Nothing can be placed until you're back online.",
  },
} as const;
