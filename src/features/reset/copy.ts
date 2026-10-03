/** Reset strings the phone needs that the shared copy lacks or words for a browser. Candidates for @noirwire/shared/copy. */
export const mobileResetCopy = {
  warning:
    "This deletes the wallet from this phone. Your recovery phrase is the only way back in. Without it, everything in your funding wallet and in every portfolio is gone for good, and nobody can restore it.",
  notRemoved:
    "The wallet could not be deleted from this phone (storage is blocked). It is still stored here, locked. Try again.",
  deleting: "Deleting...",
} as const;
