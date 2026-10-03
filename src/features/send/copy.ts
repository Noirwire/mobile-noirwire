import type { Unsendable } from "./recipientCheck";

/**
 * Send (spec 2.24), where the phone's wording differs from the shared copy:
 * no network row, no wording for the network's own currency, the scan step,
 * and the refusals the phone makes before review. Candidates to move into
 * @noirwire/shared/copy as a mobile variant.
 */
export const mobileSendCopy = {
  title: (portfolio: string) => `Send from ${portfolio}`,
  notAPortfolio: "This link does not point to a portfolio.",
  cash: "Cash",
  recipientLabel: "Recipient address",
  recipientPlaceholder: "Solana address",
  paste: "Paste",
  scan: "Scan a QR code",
  amountLabel: (symbol: string) => `Amount in ${symbol}`,
  max: "Max",
  available: "Available",
  review: "Review",
  explainer:
    "A real transfer on Solana, straight from this portfolio to the recipient. It cannot be reversed. The address is checked to be a wallet and not a token, a token account or a program; who owns it is not verified. This portfolio pays its own network cost in USDC, a few cents taken from its cash, and the review shows the amount first.",
  empty: "This portfolio is empty.",
  emptyDetail: "There is nothing in it to send.",

  scanTitle: "Scan a QR code",
  scanHint: "Point the camera at the recipient's address code.",
  notAnAddress: "That code is not a Solana address.",
  addressOnly: "Only the address was taken from this code. Enter the amount yourself.",

  pasteWarning:
    "Pasted text contains characters that cannot be part of an address. Check the address before continuing.",
  invalidAddress: "Enter a valid Solana address.",
  invalidAmount: "Enter an amount greater than zero.",
  moreThanHeld: "More than this portfolio holds.",

  unsendable: {
    program:
      "This is a program's address, not a wallet. Anything sent to it could not be moved again.",
    mint: "This is a token's own mint address, not a wallet. Anything sent to it could not be moved again.",
    tokenAccount:
      "This is a token account, not a wallet. Send to the wallet address that owns it instead.",
    offCurve:
      "This address has no private key behind it: it is a token account or another address a program controls, not a wallet. Ask for the recipient's wallet address.",
    programOwned:
      "This address is an account that a program controls, such as a stake account, not an ordinary wallet. Ask for the recipient's wallet address.",
  } satisfies Record<Unsendable, string>,
  recipientUnreadable:
    "The recipient could not be checked right now. Nothing was sent. Try again in a moment.",

  reviewTitle: "Review",
  recipientChanged:
    "The recipient's account changed while you were reviewing, so the network cost is different. Nothing was sent.",
  recipientAria: (groups: string) => `Recipient address, ${groups}`,
  tracker: "Tracker",
  amount: "Amount",
  value: "Value",

  reasons: {
    acceptLink: "Confirm that you understand the link this creates.",
    checkAddress: "Confirm that you have checked the full address.",
    lastFour: "Type the last 4 characters of the address.",
  },
  irreversible: "This cannot be undone.",
  send: "Send",

  sending: (amount: string) => `Sending ${amount}`,
  steps: ["Checking the recipient", "Sending on chain", "Confirming"],

  sent: (amount: string) => `Sent ${amount}`,
  sentBody: (portfolio: string) => `To the address you entered. It has left ${portfolio}.`,
  unknownTitle: "Sent, but not confirmed",
  unknownBody: (portfolio: string) =>
    `This was sent but could not be confirmed. It may still go through. Check ${portfolio}'s balance before trying again.`,
} as const;
