import { plural } from "@noirwire/shared/copy";

/**
 * Portfolio strings the phone needs that the shared copy lacks, or words for
 * a browser or with "stocks" where the phone says "trackers". Candidates to
 * move into @noirwire/shared/copy as a mobile variant.
 */
export const mobilePortfolioCopy = {
  notSaved: "The new portfolio could not be saved on this phone.",

  detail: {
    kindLine: (kind: string, date: string) => `${kind} · Created ${date}`,
    buyTracker: "Buy a tracker",
    addMoney: "Add money",
    earning: (amount: string) => `${amount} earning through Jupiter Lend`,
    sendDisabled: "Nothing to send yet.",
    offline: "You're offline. Nothing can be sent until you're back online.",
    seePublicView: "See public view",
    emptyTitle: "Nothing here yet.",
    addFirstTracker: "Add your first tracker",
    addMoneyFirst: "Add money first, then choose a tracker.",
    backHome: "Back to Home",
    restore: "Restore",
    cashName: "Cash",
    sellLabel: (name: string) => `Sell ${name}`,
    moreLabel: "Portfolio settings",
    refreshFailed: "Could not refresh. Pull down to try again.",
    pieLabel: (count: number) => `Pie · ${plural(count, "tracker")}`,
  },

  mix: {
    trackers: (count: number) => plural(count, "tracker"),
    nowShare: (actual: string, drift: "over" | "under" | null) =>
      drift ? `Now ${actual}% · ${drift}` : `Now ${actual}%`,
    targetLine: (weight: number) => `Target ${weight}%`,
    ringLabel: (slices: string[]) => slices.join(". "),
    sliceSpoken: (name: string, weight: number, actual: string | null, drift: string | null) =>
      [
        `${name}, target ${weight} percent`,
        actual === null ? null : `now ${actual} percent`,
        drift ? `${drift} target` : null,
      ]
        .filter(Boolean)
        .join(", "),
    centreInvested: "Invested",
    centreTarget: "Target",
    centreUnpriced: "Unpriced",
  },

  publicView: {
    eyebrow: "Public view",
    lead: "Someone with this address can see these. Your other portfolios are not shown by this address.",
    announce:
      "Public view. Showing what someone with this address can see, as far as this phone knows.",
    address: "Address",
    hidden: "Hidden",
    show: "Show",
    hide: "Hide",
    copy: "Copy",
    copied: "Copied",
    showAddress: "Show this portfolio's address",
    hideAddress: "Hide the address",
    copyAddress: "Copy this portfolio's address",
    holdings: "Holdings",
    noHoldings: "Nothing is held at this address as last read.",
    transactions: "Transactions this phone knows about",
    notFullHistory:
      "This is not the full history. Every transfer and trade on this address is public on chain, with its amount and time, including any made before this phone or outside this app.",
    noTransactions: "This phone has recorded nothing for this address.",
    notOnChainTitle: "Not written on chain",
    notOnChain: [
      "Your portfolio name",
      "Its relationship to your funding wallet",
      "Which other NoirWire portfolios you control",
    ],
    relayed:
      "These stay on this phone. Balance reads and trades are relayed by NoirWire's server, so the network provider, Jupiter and MagicBlock see this address but never your IP address. The relay stores and logs nothing; you have to trust it not to.",
    relayer:
      "When NoirWire's relayer pays a network cost for this portfolio, that transaction names the relayer, so an observer can tell this address uses NoirWire. It does not name your funding wallet or your other portfolios.",
    clue: "Funding can still create a clue. Reusing a known address or moving a distinctive amount moments later may let an observer infer a connection.",
    back: "Back to my view",
    markAction: "See public view",
  },

  settings: {
    stillHolds: (value: string) =>
      `This portfolio still holds ${value}. Archiving hides it; it does not move anything.`,
    stillHoldsUnpriced:
      "This portfolio still holds investments. Archiving hides it; it does not move anything.",
    archive: "Archive",
    restore: "Restore",
    save: "Save",
  },

  create: {
    portfolioLead: "Give it a name only you see. The name never leaves this phone.",
    kinds: {
      portfolio: { title: "Portfolio", description: "Buy one tracker at a time." },
      pie: {
        title: "Pie",
        description: "Set a mix of trackers and invest in all of them at once.",
      },
    },
  },

  icon: {
    usePieRing: "Use the pie ring",
    pieRingMark: "The pie's ring, its default mark",
    label: "Icon and colour",
    change: "Change",
    done: "Done",
    glyphGroup: "Icon",
    tintGroup: "Colour",
    tintOption: (name: string) => `${name} colour`,
  },
} as const;
