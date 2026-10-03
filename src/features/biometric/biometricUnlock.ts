import { walletCopy } from "@noirwire/shared/copy";
import type { PasswordChange } from "@noirwire/shared/wallet";
import type { BiometricKeystore, BiometricMethod } from "@/platform/biometricKeystore";
import type { BiometricSetting, Preferences } from "@/platform/preferences";
import type { VaultKeyAccess } from "./vaultKeyAccess";

export type TurnOnResult = "on" | "wrongPassword" | "notStored";

export type BiometricUnlockResult =
  | { kind: "unlocked" }
  /** Cancelled or failed: nothing is said, the password field takes over. */
  | { kind: "declined" }
  | { kind: "lockedOut" }
  /** The enrolment changed, the item is gone, and biometric unlock is now off. */
  | { kind: "changed" }
  | { kind: "refused"; problem: string };

export type BiometricUnlock = {
  /** The device's method when biometric unlock can be offered at all, else null. */
  method(): Promise<BiometricMethod | null>;
  setting(): BiometricSetting;
  subscribe(listener: () => void): () => void;
  turnOn(password: string, prompt: string): Promise<TurnOnResult>;
  turnOff(): Promise<void>;
  unlock(prompt: string): Promise<BiometricUnlockResult>;
  /**
   * Changes the wallet's password. While biometric unlock is on, the device
   * keystore takes the new vault key before the change stands; if it does
   * not, the stored wallet goes back under the old password.
   */
  changePassword(current: string, next: string, prompt: string): Promise<PasswordChange>;
  /** Deletes the keystore item and the setting, for a reset. */
  forget(): Promise<void>;
};

type Deps = {
  keystore: BiometricKeystore;
  preferences: Preferences;
  access: VaultKeyAccess;
};

/**
 * Biometric unlock as section 3.14 of the spec describes it: opt-in, the
 * vault key and nothing else in the keystore, the password still required
 * for the phrase and for a password change. Key bytes are zeroed as soon as
 * they have been handed on.
 */
export function biometricUnlock({ keystore, preferences, access }: Deps): BiometricUnlock {
  return {
    method: () => keystore.method(),
    setting: preferences.biometric,
    subscribe: preferences.subscribe,

    async turnOn(password, prompt) {
      const bits = await access.keyBitsFor(password);
      if (!bits) return "wrongPassword";
      const stored = await keystore.store(bits, prompt);
      bits.fill(0);
      if (!stored) return "notStored";
      if (await preferences.setBiometric("on")) return "on";
      // The setting was not kept, so the key must not stay behind without it.
      await keystore.remove();
      await preferences.setBiometric("off");
      return "notStored";
    },

    async turnOff() {
      await keystore.remove();
      await preferences.setBiometric("off");
    },

    async unlock(prompt) {
      if (preferences.biometric() !== "on") return { kind: "declined" };
      const read = await keystore.read(prompt);
      switch (read.kind) {
        case "key": {
          const problem = await access.unlockWithKeyBits(read.bits);
          read.bits.fill(0);
          return problem ? { kind: "refused", problem } : { kind: "unlocked" };
        }
        case "invalidated":
          await keystore.remove();
          await preferences.setBiometric("changed");
          return { kind: "changed" };
        case "lockedOut":
          return { kind: "lockedOut" };
        default:
          return { kind: "declined" };
      }
    },

    async changePassword(current, next, prompt) {
      if (preferences.biometric() !== "on") return access.changePassword(current, next);
      const result = await access.changePassword(current, next, {
        onRekey: (bits) => keystore.store(bits, prompt),
      });
      // The record is under the new password and the keystore still holds the old key.
      if (result.outcome === "changed" && result.notice === walletCopy.store.rekeyNotUndone) {
        await keystore.remove();
        await preferences.setBiometric("off");
      }
      return result;
    },

    async forget() {
      await keystore.remove();
      await preferences.clearForReset();
    },
  };
}
