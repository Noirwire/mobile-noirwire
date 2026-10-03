const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Settings strings the phone needs that the shared copy lacks, or that it
 * words for a browser. Candidates to move into @noirwire/shared/copy as a
 * mobile variant.
 */
export const mobileSettingsCopy = {
  saveFailing:
    "Changes are not being saved on this phone (storage is full or blocked). What you see here will be gone when the app closes. Your funds are not affected.",
  cleanupFailing:
    "An old copy of a recovery phrase from an earlier version could not be deleted from this phone, so it may still be readable there. Reset the wallet and import it again if this stays.",
  saving: "Saving...",

  biometric: {
    label: (method: string) => `Unlock with ${method}`,
    caption:
      "Your password is still needed to view your recovery phrase and to change the password.",
    changed: (method: string) =>
      `${sentence(method)} settings changed on this phone, so this was turned off. Turn it on again to keep using it.`,
    passwordLabel: "Enter your password to turn it on",
    turnOn: "Turn on",
    wrongPassword: "That password does not match this wallet.",
    failed: (method: string) => `${sentence(method)} was not turned on. Try again.`,
  },
  lockNow: "Lock now",
  analyticsCaption:
    "Counts which screens and actions are used. Never an address, a name, an amount, a tracker or anything you type.",
  aboutSection: "About",
  aboutRow: "About NoirWire",
  risksCaption: "What you should know before you invest",
  resetCaption: "Deletes the wallet from this phone",

  password: {
    changed:
      "Password changed. Use the new one next time you unlock. This protects the copy on this phone only: if you think someone already copied this wallet, move your funds to a new recovery phrase.",
  },

  phrase: {
    hiddenAnnouncement: "Recovery phrase hidden",
  },

  privacy: {
    title: "Privacy and your funds",
    sections: [
      {
        title: "What is public",
        body: "Every portfolio, its balances and every trade are real transactions on Solana. Trades stay public: anyone can see a portfolio's holdings, amounts and timing. Portfolio names stay on this phone only.",
      },
      {
        title: "What private funding does",
        body: "Private funding makes a portfolio harder to link back to your funding wallet. It does not make it invisible: amounts and timing may still let someone infer a connection.",
      },
      {
        title: "What stays on this phone",
        body: "Your keys and recovery phrase never leave this phone. So do your portfolio names, your watchlist and your activity list.",
      },
    ],
    partiesTitle: "Who can see what",
    parties: [
      {
        name: "NoirWire's server",
        lines: [
          "Sees your IP address and, in transit, every address the app asks about.",
          "It stores and logs nothing. You have to trust that; you cannot check it.",
          "It could link your funding wallet to a portfolio if it logged. It does not.",
        ],
      },
      {
        name: "The network provider",
        lines: [
          "Does not see your IP address.",
          "Sees every address read and every transaction sent.",
          "Requests made moments apart can let it guess that two addresses belong together.",
        ],
      },
      {
        name: "Jupiter",
        lines: [
          "Does not see your IP address.",
          "Sees the portfolio that trades or lends. Never your funding wallet.",
        ],
      },
      {
        name: "MagicBlock, the private funding service",
        lines: [
          "Does not see your IP address.",
          "Sees your funding wallet and the portfolio together. A private transfer cannot be built without naming both.",
        ],
      },
      {
        name: "NoirWire's relayer",
        lines: [
          "Does not see your IP address.",
          "Sees the portfolio that sends or lends, and who it sends to.",
          "Every action it pays for names the same relayer on chain, so an observer can tell a portfolio uses NoirWire and can group NoirWire portfolios as a set. That does not link them to you, to your funding wallet or to each other.",
        ],
      },
    ],
    phraseTitle: "Your recovery phrase",
    phraseBody:
      "Anyone with your recovery phrase can take everything in every portfolio. Never share it, never type it into a website, and never reuse it for another wallet.",
  },

  risks: {
    title: "Risks",
    sections: [
      {
        title: "What a tracker is",
        body: "A tracker is an xStocks certificate that follows the price of a company or a fund. It is not a share in that company or fund. It gives you no voting rights and no claim on the company. Its price can fall, and you can lose money.",
      },
      {
        title: "What the issuer controls",
        body: "The issuer of a tracker can freeze it, and can move or burn tokens without your signature. Dividends are not paid in cash: the issuer reinvests them by adjusting the token. xStocks are not offered in the United States, to US persons or in the issuer's prohibited countries.",
      },
      {
        title: "What stays public",
        body: "Every trade, transfer and balance of a portfolio is public on chain, with its amount and time. Private funding makes a portfolio harder to link to your funding wallet. It does not hide what the portfolio does, and amounts and timing can still let someone infer a link.",
      },
      {
        title: "Lending through Earn",
        body: "USDC in Earn is lent through Jupiter Lend. It is not a bank deposit and is not insured. The rate changes. A fault in the lending program can cause loss. When the pool is heavily borrowed, a withdrawal can be delayed.",
      },
      {
        title: "The software",
        body: "NoirWire's software has not been independently audited. It checks every transaction before signing it, but software can have faults.",
      },
      {
        title: "Your recovery phrase",
        body: "Only your recovery phrase can restore this wallet. NoirWire does not have it and cannot recover it, your password, or your funds. Anyone who has the phrase can take everything.",
      },
    ],
  },

  about: {
    title: "About",
    version: "Version",
    build: "Build",
    network: "Network",
    networkValue: "Solana",
    risks: "Risks",
    copied: "Copied",
    developmentBuild: "Development",
  },
} as const;
