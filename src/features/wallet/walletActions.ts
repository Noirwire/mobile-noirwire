import { walletUsage } from "@noirwire/shared/application";
import { onboardingCopy, walletCopy } from "@noirwire/shared/copy";
import { getPlatform } from "@noirwire/shared/platform";
import {
  catalog,
  getSnapshot,
  lock,
  resetWallet,
  storeNewWallet,
  unlock,
  verifyPassword,
  type PasswordChange,
  type ResetResult,
  type WalletDraft,
} from "@noirwire/shared/wallet";
import type { BiometricUnlock } from "../biometric/biometricUnlock";

/** The platform's analytics, asked for at the moment of each event so tests can install their own. */
const analytics = () => getPlatform().track;

/** Counted once a wallet opens, with the wallet's rough state as bands. */
export function noteUnlocked() {
  const wallet = getSnapshot();
  if (wallet) analytics()("wallet_unlocked", walletUsage(wallet, catalog));
}

export async function unlockWithPassword(password: string): Promise<string | null> {
  const problem = await unlock(password);
  if (problem) analytics()("unlock_failed");
  else noteUnlocked();
  return problem;
}

export function lockNow() {
  analytics()("wallet_locked", { by: "manual" });
  lock();
}

export type SaveOrigin = "create" | "import";

/**
 * Encrypts and stores a new wallet, which also unlocks it. A created
 * wallet's first portfolio is named "Investing"; an imported one keeps the
 * names it was found with. Rejects with the store's reason when nothing was
 * kept.
 */
export async function saveNewWallet(draft: WalletDraft, origin: SaveOrigin, password: string) {
  const wallet =
    origin === "create"
      ? {
          ...draft.wallet,
          portfolios: draft.wallet.portfolios.map((portfolio, index) =>
            index === 0 ? { ...portfolio, label: onboardingCopy.firstPortfolioLabel } : portfolio,
          ),
        }
      : draft.wallet;
  await storeNewWallet(wallet, draft.phrase, password);
  if (origin === "create") analytics()("wallet_created");
  else analytics()("wallet_imported", { found: Math.min(draft.wallet.portfolios.length, 10) });
}

/** The phrase, only for someone who types the password again now; biometrics are never enough. */
export const revealPhrase = (password: string) => verifyPassword(password);

/**
 * Changes the password through biometric unlock, which hands the new vault
 * key to the device keystore while it is on. `prompt` is what the system
 * biometric sheet says.
 */
export async function updatePassword(
  biometric: BiometricUnlock,
  current: string,
  next: string,
  prompt: string,
): Promise<PasswordChange> {
  const result = await biometric.changePassword(current, next, prompt);
  if (result.outcome === "changed") analytics()("password_changed");
  return result;
}

/**
 * Deletes the wallet, then the biometric key and every preference except the
 * analytics choice. When the vault keeps the wallet, nothing else is erased:
 * it is still stored here, locked, and biometric unlock still opens it.
 */
export async function deleteWallet(biometric: BiometricUnlock): Promise<ResetResult> {
  analytics()("wallet_reset");
  const result = await resetWallet();
  if (result.ok) await biometric.forget();
  return result;
}

export const storeMessages = walletCopy.store;
