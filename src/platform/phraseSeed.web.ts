// A browser has no native crypto module to call, and its JavaScript engine
// works a seed out in milliseconds: the key library's own is used as it is.
export { mnemonicToSeed, mnemonicToSeedSync } from "@scure/bip39";
