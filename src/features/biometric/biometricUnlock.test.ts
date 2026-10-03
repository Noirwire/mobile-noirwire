import { memoryVault } from "@noirwire/shared/testing";
import type { BiometricKeystore, KeyRead } from "@/platform/biometricKeystore";
import { vaultPreferences } from "@/platform/preferences";
import { biometricUnlock } from "./biometricUnlock";
import type { VaultKeyAccess } from "./vaultKeyAccess";

const BITS = new Uint8Array(32).fill(9);

function setup(read: KeyRead = { kind: "key", bits: BITS }, access: VaultKeyAccess | null = null) {
  const keystore: BiometricKeystore & { stored: Uint8Array | null } = {
    stored: null,
    method: async () => ({ name: "Face ID" }),
    store: async (bits) => {
      keystore.stored = bits;
      return true;
    },
    read: async () => read,
    remove: async () => {
      keystore.stored = null;
      return true;
    },
  };
  const preferences = vaultPreferences(memoryVault());
  const vaultAccess: VaultKeyAccess = access ?? {
    keyBitsFor: async (password) => (password === "right" ? BITS : null),
    unlockWithKeyBits: jest.fn(async () => null),
  };
  return {
    keystore,
    preferences,
    access: vaultAccess,
    service: biometricUnlock({ keystore, preferences, access: vaultAccess }),
  };
}

describe("biometricUnlock", () => {
  it("offers nothing while the wallet store cannot hand out the vault key", async () => {
    const preferences = vaultPreferences(memoryVault());
    const service = biometricUnlock({ keystore: setup().keystore, preferences, access: null });
    expect(await service.method()).toBeNull();
    expect(await service.turnOn("right", "p")).toBe("notStored");
    expect(await service.unlock("p")).toEqual({ kind: "declined" });
  });

  it("turns on only with the right password, storing the vault key and nothing else", async () => {
    const { service, keystore } = setup();
    expect(await service.turnOn("wrong", "p")).toBe("wrongPassword");
    expect(keystore.stored).toBeNull();
    expect(await service.turnOn("right", "p")).toBe("on");
    expect(keystore.stored).toEqual(BITS);
    expect(service.setting()).toBe("on");
  });

  it("unlocks with the released key", async () => {
    const { service, access } = setup();
    await service.turnOn("right", "p");
    expect(await service.unlock("p")).toEqual({ kind: "unlocked" });
    expect(access.unlockWithKeyBits).toHaveBeenCalledWith(BITS);
  });

  it("turns itself off and says why when the enrolment changed", async () => {
    const { service, keystore } = setup({ kind: "invalidated" });
    await service.turnOn("right", "p");
    expect(await service.unlock("p")).toEqual({ kind: "changed" });
    expect(service.setting()).toBe("changed");
    expect(keystore.stored).toBeNull();
  });

  it("falls back to the password, silently, on a cancelled prompt", async () => {
    const { service } = setup({ kind: "cancelled" });
    await service.turnOn("right", "p");
    expect(await service.unlock("p")).toEqual({ kind: "declined" });
    expect(service.setting()).toBe("on");
  });

  it("deletes the key when turned off or forgotten for a reset", async () => {
    const { service, keystore } = setup();
    await service.turnOn("right", "p");
    await service.turnOff();
    expect(keystore.stored).toBeNull();
    expect(service.setting()).toBe("off");
    await service.turnOn("right", "p");
    await service.forget();
    expect(keystore.stored).toBeNull();
    expect(service.setting()).toBe("off");
  });
});
