import {
  ACCOUNT_SIZE,
  AccountType,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Buffer } from "buffer";
import { addressSegments } from "./sendView";
import { hasForeignCharacters, recipientFromCode, unsendable } from "./recipientCheck";

const wallet = () => Keypair.generate().publicKey.toBase58();
const account = (owner: PublicKey, data = new Uint8Array(0), executable = false) => ({
  executable,
  owner: owner.toBase58(),
  data,
});

describe("unsendable", () => {
  it("allows a wallet nobody has funded and an ordinary system account", () => {
    expect(unsendable(wallet(), null)).toBeNull();
    expect(unsendable(wallet(), account(SystemProgram.programId))).toBeNull();
  });

  it("names a program, a mint, a token account and a program-owned account", () => {
    expect(unsendable(wallet(), account(SystemProgram.programId, undefined, true))).toBe("program");
    expect(unsendable(wallet(), account(TOKEN_PROGRAM_ID, new Uint8Array(MINT_SIZE)))).toBe("mint");
    expect(unsendable(wallet(), account(TOKEN_PROGRAM_ID, new Uint8Array(ACCOUNT_SIZE)))).toBe(
      "tokenAccount",
    );
    const mint2022 = new Uint8Array(ACCOUNT_SIZE + 10);
    mint2022[ACCOUNT_SIZE] = AccountType.Mint;
    expect(unsendable(wallet(), account(TOKEN_2022_PROGRAM_ID, mint2022))).toBe("mint");
    expect(unsendable(wallet(), account(Keypair.generate().publicKey))).toBe("programOwned");
  });

  it("names an address no key can sign for", () => {
    const [offCurve] = PublicKey.findProgramAddressSync([Buffer.from("x")], PublicKey.default);
    expect(unsendable(offCurve.toBase58(), null)).toBe("offCurve");
  });
});

describe("recipientFromCode", () => {
  it("takes a plain address, or only the address of a payment code", () => {
    const to = wallet();
    expect(recipientFromCode(` ${to} `)).toEqual({ address: to, fromPaymentCode: false });
    expect(recipientFromCode(`solana:${to}?amount=5&memo=x`)).toEqual({
      address: to,
      fromPaymentCode: true,
    });
    expect(recipientFromCode("https://example.com")).toBeNull();
    expect(recipientFromCode("solana:nope")).toBeNull();
  });

  it("tells pasted text holding characters an address cannot have", () => {
    expect(hasForeignCharacters(wallet())).toBe(false);
    expect(hasForeignCharacters("0OIl")).toBe(true);
  });
});

describe("addressSegments", () => {
  it("groups by four and marks the first and last six characters", () => {
    const segments = addressSegments("ABCDEFGHIJKLMNOPQRST");
    expect(segments.map((segment) => segment.text).join("")).toBe("ABCD EFGH IJKL MNOP QRST");
    expect(segments).toEqual([
      { text: "ABCD EF", strong: true },
      { text: "GH IJKL MN", strong: false },
      { text: "OP QRST", strong: true },
    ]);
  });
});
