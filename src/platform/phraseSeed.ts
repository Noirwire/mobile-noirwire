import { pbkdf2Sync } from "react-native-quick-crypto";

/** The lengths a recovery phrase can have. */
const WORD_COUNTS = [12, 15, 18, 21, 24];
const ROUNDS = 2048;
const SEED_BYTES = 64;

const nfkd = (text: string) => text.normalize("NFKD");

/**
 * The seed a recovery phrase stands for (BIP-39: PBKDF2 with HMAC-SHA512,
 * 2,048 rounds, salted with "mnemonic" and the passphrase), worked out by the
 * phone's native crypto. The key library works it out in JavaScript, which on
 * a phone takes seconds per key, and every key the wallet derives starts
 * from it: an import derives dozens, and an unlock one per portfolio. The
 * inputs and the output are exactly the library's own, which the start-up
 * checks hold it to with a known answer.
 */
export function mnemonicToSeedSync(mnemonic: string, passphrase = ""): Uint8Array {
  const phrase = nfkd(mnemonic);
  if (!WORD_COUNTS.includes(phrase.split(" ").length)) throw new Error("Invalid mnemonic");
  const encoder = new TextEncoder();
  const seed = pbkdf2Sync(
    encoder.encode(phrase),
    encoder.encode(nfkd(`mnemonic${passphrase}`)),
    ROUNDS,
    SEED_BYTES,
    "sha512",
  );
  return Uint8Array.from(seed);
}

export async function mnemonicToSeed(mnemonic: string, passphrase = ""): Promise<Uint8Array> {
  return mnemonicToSeedSync(mnemonic, passphrase);
}
