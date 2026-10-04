type Pbkdf2 = { name: "PBKDF2"; iterations: number };

const isPbkdf2 = (algorithm: unknown): algorithm is Pbkdf2 =>
  typeof algorithm === "object" &&
  algorithm !== null &&
  (algorithm as { name?: unknown }).name === "PBKDF2";

/** The count the shared keystore derives a wallet's key with. Any other derivation is left as it is. */
const WALLET_ROUNDS = 600_000;

const oneRound = <T>(algorithm: T): T =>
  isPbkdf2(algorithm) && algorithm.iterations === WALLET_ROUNDS
    ? { ...algorithm, iterations: 1 }
    : algorithm;

let restore: (() => void) | null = null;

/**
 * Derives a wallet's key in one round instead of 600,000, at the WebCrypto
 * boundary the shared keystore calls, for tests about what a screen does
 * with a wallet and not about how hard its key is to guess. The keystore's
 * own code is untouched: it asks for the full count and records it. The same
 * password and salt still give the same key, and a different password still
 * gives a different one. Every test file starts this way (jest.setup.ts).
 */
export function fastKeyDerivation() {
  if (restore) return;
  const { subtle } = crypto;
  const deriveKey = subtle.deriveKey.bind(subtle);
  const deriveBits = subtle.deriveBits.bind(subtle);
  const spies = [
    jest
      .spyOn(subtle, "deriveKey")
      .mockImplementation((algorithm, ...rest) => deriveKey(oneRound(algorithm), ...rest)),
    jest
      .spyOn(subtle, "deriveBits")
      .mockImplementation((algorithm, ...rest) => deriveBits(oneRound(algorithm), ...rest)),
  ];
  restore = () => spies.forEach((spy) => spy.mockRestore());
}

/** Runs `work` with the real derivation: the one full round trip each boundary keeps. */
export async function withRealKeyDerivation<T>(work: () => Promise<T>): Promise<T> {
  restore?.();
  restore = null;
  try {
    return await work();
  } finally {
    fastKeyDerivation();
  }
}
