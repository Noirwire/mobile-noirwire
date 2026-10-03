import type * as LocalAuthenticationModule from "expo-local-authentication";
import type * as SecureStoreModule from "expo-secure-store";

/** The device keystore item that holds a copy of the vault key, and nothing else. */
export const VAULT_KEY_ITEM = "noirwire.vaultKey";

export type BiometricMethod = {
  /** How the system names it, as used in "Use Face ID". */
  name: string;
};

export type KeyRead =
  | { kind: "key"; bits: Uint8Array }
  | { kind: "cancelled" }
  | { kind: "lockedOut" }
  /** Enrolment changed (a face or fingerprint added or removed), so the system destroyed the item. */
  | { kind: "invalidated" }
  | { kind: "failed" };

export type BiometricKeystore = {
  /** The device's biometric method, or null when it has none enrolled or cannot guard a keystore item with it. */
  method(): Promise<BiometricMethod | null>;
  /** Stores the vault key behind biometric access control. Shows the system prompt. */
  store(bits: Uint8Array, prompt: string): Promise<boolean>;
  /** Releases the vault key after a successful biometric check. Shows the system prompt. */
  read(prompt: string): Promise<KeyRead>;
  remove(): Promise<boolean>;
};

type Deps = {
  auth: Pick<
    typeof LocalAuthenticationModule,
    "hasHardwareAsync" | "isEnrolledAsync" | "supportedAuthenticationTypesAsync"
  > & { AuthenticationType: typeof LocalAuthenticationModule.AuthenticationType };
  secure: Pick<
    typeof SecureStoreModule,
    "setItemAsync" | "getItemAsync" | "deleteItemAsync" | "canUseBiometricAuthentication"
  > & { WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: SecureStoreModule.KeychainAccessibilityConstant };
  os: "ios" | "android" | string;
};

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}

const LOCKOUT = /lockout|locked out|too many attempts/i;
const CANCELLED = /cancel/i;

/**
 * The biometric unlock adapter. The vault key goes into the Keychain or
 * Keystore as an item that needs a biometric check for every read, may only
 * live on this device while it has a passcode, and is bound to the current
 * enrolment: adding or removing a face or fingerprint makes the system
 * destroy it, which a read reports as `invalidated`. The password is never
 * stored, and neither is the recovery phrase.
 */
export function biometricKeystore({ auth, secure, os }: Deps): BiometricKeystore {
  const options = (prompt: string) => ({
    requireAuthentication: true,
    authenticationPrompt: prompt,
    keychainAccessible: secure.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  });

  return {
    async method() {
      try {
        const [hardware, enrolled] = await Promise.all([
          auth.hasHardwareAsync(),
          auth.isEnrolledAsync(),
        ]);
        if (!hardware || !enrolled || !secure.canUseBiometricAuthentication()) return null;
        const types = await auth.supportedAuthenticationTypesAsync();
        const face = types.includes(auth.AuthenticationType.FACIAL_RECOGNITION);
        if (os === "ios") return { name: face ? "Face ID" : "Touch ID" };
        return { name: face ? "your face" : "your fingerprint" };
      } catch {
        return null;
      }
    },

    async store(bits, prompt) {
      try {
        await secure.setItemAsync(VAULT_KEY_ITEM, toBase64(bits), options(prompt));
        return true;
      } catch {
        return false;
      }
    },

    async read(prompt) {
      try {
        const stored = await secure.getItemAsync(VAULT_KEY_ITEM, options(prompt));
        return stored === null
          ? { kind: "invalidated" }
          : { kind: "key", bits: fromBase64(stored) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (LOCKOUT.test(message)) return { kind: "lockedOut" };
        if (CANCELLED.test(message)) return { kind: "cancelled" };
        return { kind: "failed" };
      }
    },

    async remove() {
      try {
        await secure.deleteItemAsync(VAULT_KEY_ITEM, { requireAuthentication: true });
        return true;
      } catch {
        return false;
      }
    },
  };
}
