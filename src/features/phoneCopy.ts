/**
 * Words and rules the phone needs that the shared package does not have yet.
 * Each belongs in `@noirwire/shared` and is kept here only until it moves.
 */
export const phoneCopy = {
  /**
   * The shared line says "Check your connection", which is wrong for a check
   * that runs on the phone with no network.
   */
  passwordCheckFailed: "Could not check this password. Type it again.",

  /** A name field's placeholder, worded so it cannot be mistaken for a name already typed. */
  forExample: (name: string) => `For example: ${name}`,

  /** Pressing Create with no name typed. */
  nameNeeded: "Type a name first.",

  /** The plain retry offered wherever a read or a check did not come back. */
  tryAgain: "Try again",

  /** What a wait that ran past its limit ends with, by what was being waited for. */
  overdue: {
    check: "We couldn't check this. Nothing was sent. Try again.",
    review: "We couldn't prepare your review. Nothing was sent. Try again.",
    action:
      "This is taking longer than it should. It may still go through, so check the balance and Activity before doing it again.",
    prices:
      "We couldn't load prices. They are missing or out of date here, and are asked for again every half minute.",
    chart: "We couldn't load this chart.",
    earn: "We couldn't update what is in Earn. What you see may be out of date.",
    fundingBalance: "We couldn't read your funding wallet's balance.",
  },
} as const;
