/**
 * Earn (spec 2.26) and its deposit and withdraw sheet (spec 2.27), where the
 * phone's wording differs from the shared copy: a review step the web does
 * not have, the action named with its amount, and the screen's own lines.
 * Candidates to move into @noirwire/shared/copy as a mobile variant.
 */
export const mobileEarnCopy = {
  title: "Earn",
  rateLabel: "Current variable rate",
  rateAnnouncement: (rate: string) => `Current variable rate, ${rate} percent a year`,
  deposit: "Deposit",
  withdraw: "Withdraw",
  noCash: "No portfolio has cash to deposit. Add money to a portfolio first.",
  portfolios: "Your portfolios",
  inEarn: "in Earn",
  archived: "Archived",
  restore: "Restore this portfolio to move funds.",
  riskLine: "Lending carries risk and the rate changes.",
  readRisks: "Read the risks",
  noPortfolio: "Create a portfolio to use Earn.",
  noPortfolioDetail: "Earn lends a portfolio's cash.",
  newPortfolio: "New portfolio",

  continueWith: (portfolio: string) => `Continue with ${portfolio}`,
  cash: (amount: string) => `${amount} cash`,
  lent: (amount: string) => `${amount} in Earn`,
  lead: {
    deposit: (portfolio: string) => `Lend USDC from ${portfolio}.`,
    withdraw: (portfolio: string) => `Return USDC to ${portfolio}.`,
  },
  available: "Available",
  review: "Review",
  invalidAmount: "Enter an amount greater than zero.",
  moreThanAvailable: "More than is available.",
  smallerThanCost: "This withdrawal is smaller than its own network cost.",

  reviewTitle: "Review",
  terms: {
    leavesCash: (portfolio: string) => `Leaves ${portfolio}'s cash`,
    intoEarn: "Goes into Earn",
    totalLeaving: (portfolio: string) => `Total leaving ${portfolio}'s cash`,
    leavesEarn: "Leaves Earn",
    arrives: (portfolio: string) => `Arrives in ${portfolio}'s cash`,
  },
  openingReason: "The network cost includes opening this holding, a one-time cost.",
  fromProceeds:
    "The network cost is paid out of the USDC this returns, so no cash is needed first.",
  depositRisk: (venue: string) =>
    `USDC is lent through ${venue}. It is not a bank deposit, and withdrawals can be delayed.`,
  confirm: {
    deposit: (amount: string) => `Deposit ${amount}`,
    withdraw: (amount: string) => `Withdraw ${amount}`,
  },

  progress: {
    deposit: (amount: string) => `Depositing ${amount}`,
    withdraw: (amount: string) => `Withdrawing ${amount}`,
  },
  steps: ["Sending on chain", "Confirming", "Reading the new balance"],

  landed: {
    deposit: (amount: string) => `Deposited ${amount}`,
    withdraw: (amount: string) => `Withdrew ${amount}`,
  },
  landedBody: {
    deposit: (portfolio: string) => `From ${portfolio}, now in Earn.`,
    withdraw: (portfolio: string) => `Back in ${portfolio}'s cash.`,
  },
  unknownTitle: "Sent, but not confirmed",
  unknownBody: (portfolio: string) =>
    `This was sent but could not be confirmed. It may still go through. Check ${portfolio}'s balance before trying again.`,
} as const;
