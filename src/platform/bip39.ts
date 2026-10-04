/**
 * What the bundler hands out as `@scure/bip39` on a phone (metro.config.js):
 * the library itself, with the one slow step, turning a phrase into its
 * seed, done by the phone's native crypto. Nothing imports this file by
 * name.
 */
export * from "@scure/bip39";
export { mnemonicToSeed, mnemonicToSeedSync } from "./phraseSeed";
