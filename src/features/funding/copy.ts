/**
 * Fund privately (spec 2.16) and Settings, Funding wallet (spec 2.31), where
 * the phone's wording differs from the shared copy: the web names the
 * network's own currency and offers a public route, and the phone does
 * neither. Candidates to move into @noirwire/shared/copy as a mobile variant.
 */
export const mobileFundingCopy = {
  title: "Add money privately",
  chooseTitle: "Add money to",
  continueWith: (portfolio: string) => `Continue with ${portfolio}`,
  cash: (amount: string) => `${amount} cash`,

  lead: (portfolio: string) =>
    `Move USDC into ${portfolio} without publishing a transfer between your funding wallet and it.`,
  available: "Available in funding wallet",
  amountLabel: "Amount in USDC",
  terms: {
    arrives: (portfolio: string) => `Arrives in ${portfolio}`,
    privacyFee: (percent: number) => `Privacy fee, ${percent}% of the amount`,
    relayFee: "Relay fee, flat",
    leaves: "Leaves your funding wallet",
  },
  costs: (minimum: string) =>
    `Both fees are charged in USDC by the settlement service, on top of the amount. The relay fee pays the network cost. The smallest transfer is ${minimum}, and it usually arrives within seconds.`,
  review: "Review",
  footer:
    "A private transfer breaks the on-chain link between your funding wallet and this portfolio. It does not hide the amount, and the settlement service sees both addresses. It does not see your IP address: the request is relayed by NoirWire's server, which stores and logs nothing. Privacy from the chain, not from the service.",

  empty: "Your funding wallet is empty.",
  emptyDetail: "Send USDC on Solana to your funding address first.",
  showAddress: "Show my funding address",

  reviewTitle: "Review",
  notSignedAbove: "If the transfer would take more than this total, it is not signed.",

  stages: [
    {
      title: "Sent to the private route",
      caption: "Signed by your funding wallet and handed to the settlement queue.",
    },
    {
      title: "Waiting in the queue",
      caption: (min: number, max: number) =>
        `Delivered after ${min} to ${max} seconds, split across several entries.`,
    },
    {
      title: (portfolio: string) => `Arrived in ${portfolio}`,
      caption: "Confirmed by reading this portfolio's real balance.",
    },
  ],
  stillWorking: "Still working. You can leave this open; nothing more is needed from you.",

  arrived: (amount: string, portfolio: string) =>
    `${amount} is now in ${portfolio}, read back from its real balance.`,
  feesCharged: (fees: string) => ` ${fees} in fees was charged on top.`,
  seePublicView: "See public view",

  settingsRow: "Funding wallet",
  settingsSection: "Wallet",
  page: {
    title: "Funding wallet",
    waiting: "Waiting to be moved",
    lead: "Money sent here must be moved into a portfolio before you can invest.",
    empty: "Nothing is waiting. Send USDC on Solana to your funding address to add money.",
    move: "Move to a portfolio",
    showAddress: "Show my funding address",
    readFailed: "Could not refresh. Pull down to try again.",
    balanceLabel: (amount: string) => `${amount} waiting to be moved`,
  },
} as const;
