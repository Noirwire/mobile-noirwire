import { isOffCurveAddress, isRecipientAddress } from "@noirwire/shared/infrastructure";
import {
  ACCOUNT_SIZE,
  AccountType,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";

/**
 * What a recipient is when it cannot receive a send: a program, a token's
 * own mint, a token account, an address no key can sign for, or an account
 * another program controls. The same reading the shared send client makes
 * before signing, made here at "Review" so the refusal can say which it is.
 * A candidate to move into the shared infrastructure, which keeps this check
 * internal today.
 */
export type Unsendable = "program" | "mint" | "tokenAccount" | "offCurve" | "programOwned";

/** The parts of an account the check reads. Null for an address that holds nothing yet. */
export type RecipientAccount = {
  executable: boolean;
  owner: string;
  data: Uint8Array;
} | null;

const TOKEN_PROGRAMS = new Set([TOKEN_PROGRAM_ID.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()]);
const SYSTEM_PROGRAM = SystemProgram.programId.toBase58();

/** In Token-2022 both kinds can grow past their base size; the byte after the base account layout says which it is. */
function isMint(data: Uint8Array): boolean {
  return data.length === MINT_SIZE || data[ACCOUNT_SIZE] === AccountType.Mint;
}

/**
 * Why `address` cannot receive, given what the network holds at it. An
 * address that does not exist yet is a wallet nobody has funded, and is
 * allowed; one that exists must belong to the System program, as every
 * wallet does.
 */
export function unsendable(address: string, account: RecipientAccount): Unsendable | null {
  if (account?.executable) return "program";
  if (account && TOKEN_PROGRAMS.has(account.owner)) {
    return isMint(account.data) ? "mint" : "tokenAccount";
  }
  if (isOffCurveAddress(address)) return "offCurve";
  if (account && account.owner !== SYSTEM_PROGRAM) return "programOwned";
  return null;
}

/** The characters a Solana address is written in. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]*$/;

/** Whether pasted text holds characters that cannot be part of an address. */
export function hasForeignCharacters(text: string): boolean {
  return !BASE58.test(text.trim());
}

export type ScannedRecipient = { address: string; fromPaymentCode: boolean };

/**
 * The address in a scanned code: a plain Solana address, or the address of a
 * `solana:` payment code with everything after it dropped. Null for anything
 * else. An amount or a label in a payment code is never taken.
 */
export function recipientFromCode(text: string): ScannedRecipient | null {
  const trimmed = text.trim();
  if (isRecipientAddress(trimmed)) return { address: trimmed, fromPaymentCode: false };
  const payment = /^solana:([^?/#]+)/i.exec(trimmed);
  if (payment && isRecipientAddress(payment[1])) {
    return { address: payment[1], fromPaymentCode: true };
  }
  return null;
}
