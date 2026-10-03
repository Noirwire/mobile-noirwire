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
  /** Deletes the keystore item and the setting, for a reset. */
  forget(): Promise<void>;
};

type Deps = {
  keystore: BiometricKeystore;
  preferences: Preferences;
  access: VaultKeyAccess | null;
};

/**
 * Biometric unlock as section 3.14 of the spec describes it: opt-in, the
 * vault key and nothing else in the keystore, the password still required
 * for the phrase and for a password change.
 */
export function biometricUnlock({ keystore, preferences, access }: Deps): BiometricUnlock {
  return {
    method: async () => (access ? keystore.method() : null),
    setting: preferences.biometric,
    subscribe: preferences.subscribe,

    async turnOn(password, prompt) {
      if (!access) return "notStored";
      const bits = await access.keyBitsFor(password);
      if (!bits) return "wrongPassword";
      if (!(await keystore.store(bits, prompt))) return "notStored";
      return (await preferences.setBiometric("on")) ? "on" : "notStored";
    },

    async turnOff() {
      await keystore.remove();
      await preferences.setBiometric("off");
    },

    async unlock(prompt) {
      if (!access || preferences.biometric() !== "on") return { kind: "declined" };
      const read = await keystore.read(prompt);
      switch (read.kind) {
        case "key": {
          const problem = await access.unlockWithKeyBits(read.bits);
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

    async forget() {
      await keystore.remove();
      await preferences.clearForReset();
    },
  };
}
