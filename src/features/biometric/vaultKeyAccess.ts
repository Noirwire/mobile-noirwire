/**
 * What biometric unlock needs from the wallet store and does not get yet.
 *
 * Biometric unlock keeps a copy of the vault key in the device keystore, so
 * it needs the key's raw bytes once (when it is turned on, and again when the
 * password changes) and a way to open the stored record with those bytes
 * instead of a password. The shared store derives a non-extractable key from
 * the password and opens the record only through `unlock(password)`, so
 * neither half exists yet. Until the shared package exports them, `null`
 * here keeps biometric unlock off on every device and its controls hidden.
 */
export type VaultKeyAccess = {
  /** The raw 256-bit vault key `password` derives for the stored record, or null when it does not open it. */
  keyBitsFor(password: string): Promise<Uint8Array | null>;
  /** Unlocks with raw key bits exactly as `unlock(password)` does. Null on success, else the reason. */
  unlockWithKeyBits(bits: Uint8Array): Promise<string | null>;
};

export const sharedVaultKeyAccess: VaultKeyAccess | null = null;
