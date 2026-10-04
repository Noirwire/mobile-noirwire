import { mnemonicToSeedSync } from "@/platform/phraseSeed";

/**
 * What the wallet needs from the JavaScript runtime before it may run. Each
 * check is a small known-answer test, so a polyfill that exists but computes
 * the wrong thing fails just like one that is missing.
 */

type Runtime = Pick<
  typeof globalThis,
  "crypto" | "TextEncoder" | "TextDecoder" | "URL" | "atob" | "btoa"
>;

type SeedOf = (phrase: string) => Uint8Array;

type RuntimeCheck = {
  name: string;
  passes: (runtime: Runtime, seedOf: SeedOf) => boolean | Promise<boolean>;
};

const KDF_ITERATIONS = 1000;
const EXPECTED_CIPHERTEXT = "df30a8c0faaa219317dcdeea784ee3ba83561e1d60";

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomValuesAreRandom({ crypto }: Runtime) {
  const first = new Uint8Array(32);
  const second = new Uint8Array(32);
  const returned = crypto.getRandomValues(first);
  crypto.getRandomValues(second);
  return returned === first && first.some((byte) => byte !== 0) && hex(first) !== hex(second);
}

/** The keystore's own sequence: a password-derived AES-GCM key, sealed and opened again. */
async function subtleSealsAndOpens({ crypto, TextEncoder, TextDecoder }: Runtime) {
  const encoder = new TextEncoder();
  const password = await crypto.subtle.importKey(
    "raw",
    encoder.encode("noirwire boot check"),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("fixed salt"),
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    password,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const cipher = { name: "AES-GCM", iv: new Uint8Array(12).fill(7) };
  const sealed = await crypto.subtle.encrypt(cipher, key, encoder.encode("raven"));
  const opened = await crypto.subtle.decrypt(cipher, key, sealed);
  return (
    hex(new Uint8Array(sealed)) === EXPECTED_CIPHERTEXT &&
    new TextDecoder().decode(opened) === "raven"
  );
}

function textEncodes({ TextEncoder }: Runtime) {
  return hex(new TextEncoder().encode("é")) === "c3a9";
}

function textDecodes({ TextDecoder }: Runtime) {
  return new TextDecoder().decode(new Uint8Array([0xc3, 0xa9])) === "é";
}

function urlParses({ URL }: Runtime) {
  const url = new URL("https://api.example.com:8443/v1/quote?side=buy");
  return (
    url.hostname === "api.example.com" &&
    url.port === "8443" &&
    url.pathname === "/v1/quote" &&
    url.searchParams.get("side") === "buy"
  );
}

function base64RoundTrips({ atob, btoa }: Runtime) {
  return btoa("noir") === "bm9pcg==" && atob("bm9pcg==") === "noir";
}

/** A recovery phrase is normalised before it is hashed; a runtime that skips this derives the wrong keys. */
function normalizesNfkc() {
  return "ﬁ".normalize("NFKC") === "fi" && "Å".normalize("NFKC") === "Å";
}

const KNOWN_PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const KNOWN_SEED =
  "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4";

/** Every key comes from the phrase's seed: a seed worked out wrongly opens somebody else's addresses. */
function phraseDerivesItsSeed(_runtime: Runtime, seedOf: SeedOf) {
  return hex(seedOf(KNOWN_PHRASE)) === KNOWN_SEED;
}

const CHECKS: RuntimeCheck[] = [
  { name: "crypto.getRandomValues", passes: randomValuesAreRandom },
  { name: "crypto.subtle", passes: subtleSealsAndOpens },
  { name: "TextEncoder", passes: textEncodes },
  { name: "TextDecoder", passes: textDecodes },
  { name: "URL", passes: urlParses },
  { name: "atob and btoa", passes: base64RoundTrips },
  { name: "String.prototype.normalize", passes: normalizesNfkc },
  { name: "Recovery phrase seed", passes: phraseDerivesItsSeed },
];

/** The names of the checks that failed. A check that throws has failed. */
export async function failedRuntimeChecks(
  runtime: Runtime = globalThis,
  seedOf: SeedOf = mnemonicToSeedSync,
): Promise<string[]> {
  const results = await Promise.all(
    CHECKS.map(async ({ name, passes }) => {
      try {
        return (await passes(runtime, seedOf)) ? null : name;
      } catch {
        return name;
      }
    }),
  );
  return results.filter((name) => name !== null);
}
