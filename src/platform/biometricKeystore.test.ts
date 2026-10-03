import { biometricKeystore, VAULT_KEY_ITEM } from "./biometricKeystore";

const FACIAL = 2;
const FINGERPRINT = 1;

function deps(options: { enrolled?: boolean; types?: number[]; os?: string } = {}) {
  const items = new Map<string, string>();
  const secure = {
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 7 as never,
    canUseBiometricAuthentication: jest.fn(() => true),
    setItemAsync: jest.fn(async (key: string, value: string) => void items.set(key, value)),
    getItemAsync: jest.fn(async (key: string) => items.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => void items.delete(key)),
  };
  const auth = {
    AuthenticationType: { FINGERPRINT, FACIAL_RECOGNITION: FACIAL, IRIS: 3 } as never,
    hasHardwareAsync: jest.fn(async () => true),
    isEnrolledAsync: jest.fn(async () => options.enrolled ?? true),
    supportedAuthenticationTypesAsync: jest.fn(async () => options.types ?? [FACIAL]),
  };
  return {
    items,
    secure,
    auth,
    keystore: biometricKeystore({ auth, secure, os: options.os ?? "ios" }),
  };
}

describe("biometricKeystore", () => {
  it("names the method as each system does", async () => {
    expect(await deps().keystore.method()).toEqual({ name: "Face ID" });
    expect(await deps({ types: [FINGERPRINT] }).keystore.method()).toEqual({ name: "Touch ID" });
    expect(await deps({ os: "android", types: [FINGERPRINT] }).keystore.method()).toEqual({
      name: "your fingerprint",
    });
    expect(await deps({ os: "android", types: [FACIAL] }).keystore.method()).toEqual({
      name: "your face",
    });
  });

  it("offers nothing on a device with no biometrics enrolled", async () => {
    expect(await deps({ enrolled: false }).keystore.method()).toBeNull();
  });

  it("stores only the key, behind biometric access on this device only, and reads it back", async () => {
    const { keystore, secure, items } = deps();
    const bits = Uint8Array.from({ length: 32 }, (_, index) => index);
    expect(await keystore.store(bits, "Unlock NoirWire")).toBe(true);
    expect(secure.setItemAsync).toHaveBeenCalledWith(VAULT_KEY_ITEM, expect.any(String), {
      requireAuthentication: true,
      authenticationPrompt: "Unlock NoirWire",
      keychainAccessible: 7,
    });
    expect([...items.keys()]).toEqual([VAULT_KEY_ITEM]);
    expect(await keystore.read("Unlock NoirWire")).toEqual({ kind: "key", bits });
  });

  it("reads a destroyed item as a changed enrolment", async () => {
    expect(await deps().keystore.read("p")).toEqual({ kind: "invalidated" });
  });

  it("tells a cancelled prompt from a locked-out sensor and from any other failure", async () => {
    const { keystore, secure } = deps();
    secure.getItemAsync.mockRejectedValueOnce(new Error("User canceled the operation"));
    expect(await keystore.read("p")).toEqual({ kind: "cancelled" });
    secure.getItemAsync.mockRejectedValueOnce(new Error("Biometry is locked out"));
    expect(await keystore.read("p")).toEqual({ kind: "lockedOut" });
    secure.getItemAsync.mockRejectedValueOnce(new Error("something else"));
    expect(await keystore.read("p")).toEqual({ kind: "failed" });
  });

  it("deletes the item", async () => {
    const { keystore, items } = deps();
    await keystore.store(new Uint8Array(32), "p");
    expect(await keystore.remove()).toBe(true);
    expect(items.size).toBe(0);
  });
});
