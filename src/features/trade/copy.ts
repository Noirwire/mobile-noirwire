/**
 * Trade sheet strings the phone needs that the shared copy lacks, or words
 * for a browser. Candidates to move into @noirwire/shared/copy as a mobile
 * variant.
 */
export const mobileTradeCopy = {
  chooseTracker: (side: "buy" | "sell") => `${side === "buy" ? "Buy" : "Sell"} a tracker`,
  trackerLabel: "Tracker",
  whichPortfolio: (side: "buy" | "sell") =>
    side === "buy" ? "Which portfolio buys it?" : "Which portfolio sells it?",
  cashAvailable: (amount: string) => `${amount} available`,
  held: (amount: string) => `${amount} held`,
  continueWith: (label: string) => `Continue with ${label}`,
  smallestOrder: (smallest: string) =>
    `The smallest order is about ${smallest} USDC. Your order price is shown at review.`,
  belowSmallest: (smallest: string) => `The smallest order is about ${smallest} USDC.`,
  noLiveToConvert: "No live price to convert with.",
  noCash: "This portfolio has no cash to invest.",
  noCashDetail: "Move money into this portfolio first.",

  headline: {
    spend: (dollars: string, portfolio: string) => `Spend ${dollars} from ${portfolio}`,
    sell: (amount: string, portfolio: string) => `Sell ${amount} from ${portfolio}`,
    receiveAtLeast: (amount: string) => `Receive at least ${amount}`,
  },
  heldFor: (seconds: number) => `Price held for ${seconds} second${seconds === 1 ? "" : "s"}.`,
  totalCost: "Total cost",
  totalReceive: "Total you receive, at least",
  includedInFee: "Included in the fee",
  alreadyPaid: "Already paid",
  alreadyPaidReason: "The holding is open. The network cost for that is already paid.",
  whatIsCost: "What is the network cost?",
  trackerLine: (symbol: string) =>
    `${symbol} is a tracker, not a share, and its issuer keeps control over it.`,
  readRisks: "Read the risks",
  risksTitle: "Risks",
  publicLine: "This portfolio's trades and holdings are public.",
  nothingTraded: "Nothing was traded.",
  priceMoved:
    "The price moved before this order could be placed. Nothing was traded. Review the new price.",
  costRose: "The network cost rose before this could be sent. Nothing was sent.",
  notNow: "This can't be done right now. Nothing was charged. Please try again in a few minutes.",
  offline: "You're offline. Nothing can be confirmed until you're back online.",

  progress: {
    title: (side: "buy" | "sell") =>
      side === "buy" ? "Checking your purchase" : "Checking your sale",
    opening: (symbol: string) => `Opening the holding for ${symbol}`,
    opened: "The holding is open. The network cost for that is already paid.",
    pricing: "Getting the price for your order",
    placing: "Placing the order",
    reading: "Reading the new balance",
    stillWorking: "Still working. You can leave this open; nothing more is needed from you.",
  },

  result: {
    bought: (amount: string) => `Bought ${amount}`,
    sold: (amount: string) => `Sold ${amount}`,
    boughtFor: (dollars: string, portfolio: string) => `For ${dollars}, in ${portfolio}.`,
    soldFor: (dollars: string, portfolio: string) => `For ${dollars}, now in ${portfolio}'s cash.`,
    placed: "Order placed",
    placedUnread: "The new balance could not be read yet and will appear shortly.",
    unknown: "Sent, but not confirmed",
    unknownBody: (portfolio: string) =>
      `This was sent but could not be confirmed. It may still go through. Check ${portfolio}'s balance before trying again.`,
    notPlaced: "Order not placed",
    notPlacedBody:
      "The holding is open. The network cost for that is already paid and cannot be returned. Nothing else was charged, and placing the order again has no further network cost.",
    reviewNewPrice: "Review a new price",
    done: "Done",
    close: "Close",
  },
} as const;
