/**
 * Onboarding strings the phone says differently from the shared copy, which
 * is written for a browser ("this browser") or for the web's quiz rules.
 * Candidates to move into @noirwire/shared/copy as a mobile variant.
 */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const mobileOnboardingCopy = {
  welcome: {
    trust:
      "Your keys and recovery phrase stay on this phone. Network requests are relayed by NoirWire's server, which stores and logs nothing. Tracker issuers keep control over their own tokens.",
  },
  phrase: {
    intro:
      "These words are the only way back into your money if this phone is lost. Write them on paper. Anyone who sees them can take everything.",
    continueReason: "Reveal the words and confirm you have saved them.",
  },
  confirm: {
    intro: "Pick the word at each position from the list you wrote down.",
    checkWord: (position: number) => `Check word ${position} on your paper.`,
    restart: "Let's start again with different words. Look at your paper first.",
    showAgain: "Show phrase again",
    tryAgain: "Try again",
  },
  import: {
    intro:
      "Type or paste the 12 or 24 word recovery phrase. It stays on this phone and is checked against the Solana network only to find what it already holds.",
    paste: "Paste",
    checking: "Checking what this phrase holds...",
    slow: "Looking for portfolios this phrase already has. This can take a moment.",
    networkFailed: "Could not reach the network to check this phrase. Try again.",
    offline: "You're offline. Importing needs the network to find what this phrase holds.",
  },
  source: {
    title: "Where did this phrase come from?",
    intro:
      "A phrase can open two different sets of addresses, depending on the app that made it. Here is what each one holds.",
    noirwire: "NoirWire",
    otherWallet: "Another Solana wallet",
    otherWalletExamples: "Such as Phantom or Solflare.",
    notSure: "Not sure",
    used: "This one has been used.",
    opensMostWallets: "Opens the addresses most other wallets use. You can switch afterwards.",
    opensUsed: "Opens the set that has been used.",
    nothingFound: "Nothing found on chain yet",
    tokenBalances: "Token balances",
    open: "Open this wallet",
  },
  result: {
    found: (portfolios: string) => `Found ${portfolios} this phrase already had on chain.`,
    foundBalances: "Found token balances this phrase already had on chain.",
    nothing: "Nothing was found on chain for these addresses yet. Add money whenever you're ready.",
    showAddress: "Show funding address",
    hideAddress: "Hide",
    addressLabel: "Funding address",
  },
  password: {
    intro:
      "Your wallet is encrypted with this password before it is stored on this phone. We never see it and it is never sent anywhere. Anyone who gets a copy of this phone's data can try to guess it, so it has to be hard to guess.",
    notSaved:
      "This phone would not save the wallet (storage is full or blocked). Nothing was changed.",
    alreadyStored: "A wallet is already stored on this phone. Nothing was saved.",
    hide: "Hide password",
  },
  biometric: {
    title: (method: string) => `Unlock with ${method}?`,
    lead: (method: string) =>
      `Open NoirWire with ${method} instead of typing your password each time. Your password is still needed to view your recovery phrase and to change the password.`,
    use: (method: string) => `Use ${method}`,
    notNow: "Not now",
    notTurnedOn: (method: string) =>
      `${sentence(method)} was not turned on. You can turn it on later in Settings.`,
  },
} as const;
