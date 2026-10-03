import { getPlatform } from "@noirwire/shared/platform";
import {
  STORAGE_KEY,
  changePassword,
  isEnvelope,
  open,
  unlockWithKeyBits,
  vaultKeyBits,
  vaultKeyFromBits,
  type Envelope,
} from "@noirwire/shared/wallet";

/**
 * What biometric unlock asks of the shared wallet store: the vault key's raw
 * bytes for a password that opens the stored record, a way to open the
 * record with those bytes, and a password change that hands the new key over
 * before it stands.
 */
export type VaultKeyAccess = {
  /** The raw 256-bit vault key `password` derives for the stored record, or null when it does not open it. */
  keyBitsFor(password: string): Promise<Uint8Array | null>;
  /** Unlocks with raw key bits exactly as `unlock(password)` does. Null on success, else the reason. */
  unlockWithKeyBits: typeof unlockWithKeyBits;
  changePassword: typeof changePassword;
};

async function storedEnvelope(): Promise<Envelope | null> {
  const read = await getPlatform().vault.read(STORAGE_KEY);
  if (!read.ok || read.value === null) return null;
  try {
    const parsed: unknown = JSON.parse(read.value);
    return isEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const sharedVaultKeyAccess: VaultKeyAccess = {
  async keyBitsFor(password) {
    const envelope = await storedEnvelope();
    if (!envelope) return null;
    const bits = await vaultKeyBits(envelope, password);
    const opens = (await open(await vaultKeyFromBits(envelope, bits), envelope)) !== null;
    if (opens) return bits;
    bits.fill(0);
    return null;
  },
  unlockWithKeyBits,
  changePassword,
};
