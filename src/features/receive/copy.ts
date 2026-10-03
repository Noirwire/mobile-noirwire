/**
 * Receive strings the phone needs that the shared copy lacks or words for a
 * browser. Candidates to move into @noirwire/shared/copy as a mobile variant.
 */
export const mobileReceiveCopy = {
  fundingTitle: "Your funding address",
  portfolioTitle: (name: string) => `Receive in ${name}`,
  portfolioNotice:
    "A transfer straight to this address is public and ties the sender to this portfolio. To move in your own money, use Add money instead.",
  hiddenFunding: "Your funding address is hidden.",
  showAddress: "Show address",
  copyAddress: "Copy address",
  copied: "Copied",
  qrFunding: "QR code of your funding address",
  qrPortfolio: (name: string) => `QR code of ${name}'s address`,
  afterArrival: "Once it arrives, move it into a portfolio through the private route.",
  archived: "This portfolio is archived. Restore it before receiving into it.",
  missing: "That portfolio does not exist.",
} as const;
