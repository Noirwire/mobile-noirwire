/**
 * Activity strings the phone needs that the shared copy lacks: tracker names
 * in titles, the send caption, date headings and the detail sheet.
 * Candidates to move into @noirwire/shared/copy as a mobile variant.
 */
export const mobileActivityCopy = {
  title: "Activity",
  filtersLabel: "Show",
  bought: (tracker: string) => `Bought ${tracker}`,
  sold: (tracker: string) => `Sold ${tracker}`,
  sentCaption: (portfolio: string) => `To an address you entered · ${portfolio}`,
  today: "Today",
  yesterday: "Yesterday",
  emptyDetail:
    "History is kept on this phone only. A wallet restored on a new phone starts with an empty list.",
  plus: "plus",
  minus: "minus",

  detail: {
    portfolio: "Portfolio",
    date: "Date",
    amount: "Amount",
    valueAtTime: "Value at the time",
    sentTo: "Sent to",
    addressYouEntered: "An address you entered",
    show: "Show",
    hide: "Hide",
    copy: "Copy",
    copied: "Copied",
    showAddress: "Show the address it was sent to",
    hideAddress: "Hide the address",
    copyAddress: "Copy the address it was sent to",
    openPortfolio: (name: string) => `Open ${name}`,
    recorded: "Recorded on this phone when it happened. The transfer itself is public on chain.",
  },
} as const;
