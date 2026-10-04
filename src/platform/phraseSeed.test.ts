import * as library from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { Buffer } from "buffer";
import * as shim from "./bip39";
import { mnemonicToSeed, mnemonicToSeedSync } from "./phraseSeed";

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

const TWELVE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("mnemonicToSeedSync", () => {
  it("answers the published seed for a known phrase", () => {
    expect(hex(mnemonicToSeedSync(TWELVE))).toBe(
      "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4",
    );
  });

  it("answers exactly what the key library answers, for 12 and 24 words, with and without a passphrase", async () => {
    for (const strength of [128, 256]) {
      const phrase = library.generateMnemonic(wordlist, strength);
      expect(hex(mnemonicToSeedSync(phrase))).toBe(hex(library.mnemonicToSeedSync(phrase)));
      expect(hex(mnemonicToSeedSync(phrase, "pässword"))).toBe(
        hex(library.mnemonicToSeedSync(phrase, "pässword")),
      );
      expect(hex(await mnemonicToSeed(phrase))).toBe(hex(library.mnemonicToSeedSync(phrase)));
    }
  });

  it("refuses what the key library refuses", () => {
    expect(() => mnemonicToSeedSync("abandon about")).toThrow("Invalid mnemonic");
    expect(() => library.mnemonicToSeedSync("abandon about")).toThrow("Invalid mnemonic");
  });
});

describe("the module a phone bundles as the key library", () => {
  it("is the library with only the seed step replaced", () => {
    const standIn: Record<string, unknown> = shim;
    const real: Record<string, unknown> = library;
    expect(standIn.mnemonicToSeedSync).toBe(mnemonicToSeedSync);
    expect(standIn.mnemonicToSeed).toBe(mnemonicToSeed);
    expect(Object.keys(standIn).sort()).toEqual(Object.keys(real).sort());
    for (const name of Object.keys(real)) {
      if (name !== "mnemonicToSeed" && name !== "mnemonicToSeedSync") {
        expect(standIn[name]).toBe(real[name]);
      }
    }
  });
});
