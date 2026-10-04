import { walletCopy } from "@noirwire/shared/copy";
import { memoryVault } from "@noirwire/shared/testing";
import { isUnlocked, lock, unlock } from "@noirwire/shared/wallet";
import { vaultPreferences } from "@/platform/preferences";
import {
  STRONG_PASSWORD,
  forgetWallet,
  installTestPlatform,
  memoryKeystore,
  storedLockedWallet,
} from "../testServices";
import { biometricUnlock } from "./biometricUnlock";
import { sharedVaultKeyAccess } from "./vaultKeyAccess";
import { withRealKeyDerivation } from "../../../jest/keyDerivation";

const NEXT_PASSWORD = "lantern-quartz-meadow-harbor-violet";

/** The real shared wallet store over an in-memory vault, a stored and locked wallet, and a keystore in memory. */
async function setup() {
  const { vault } = installTestPlatform();
  await storedLockedWallet();
  const keystore = memoryKeystore();
  const preferences = vaultPreferences(memoryVault());
  const service = biometricUnlock({ keystore, preferences, access: sharedVaultKeyAccess });
  return { vault, keystore, preferences, service };
}

afterEach(() => forgetWallet());

describe("biometricUnlock", () => {
  it("is offered wherever the device has a biometric method", async () => {
    const { service } = await setup();
    expect(await service.method()).toEqual({ name: "Face ID" });
  });

  it("turns on only with the right password, storing the 32 key bytes and nothing else", async () => {
    const { service, keystore } = await setup();
    expect(await service.turnOn("not the password", "p")).toBe("wrongPassword");
    expect(keystore.stored).toBeNull();
    expect(service.setting()).toBe("off");
    expect(await service.turnOn(STRONG_PASSWORD, "p")).toBe("on");
    expect(keystore.stored).toHaveLength(32);
    expect(service.setting()).toBe("on");
  });

  it("stays off when the keystore did not take the key", async () => {
    const { service, keystore } = await setup();
    keystore.refuseStore = true;
    expect(await service.turnOn(STRONG_PASSWORD, "p")).toBe("notStored");
    expect(service.setting()).toBe("off");
  });

  it("opens the stored wallet with the released key, end to end", () =>
    withRealKeyDerivation(async () => {
      const { service } = await setup();
      await service.turnOn(STRONG_PASSWORD, "p");
      expect(isUnlocked()).toBe(false);
      expect(await service.unlock("p")).toEqual({ kind: "unlocked" });
      expect(isUnlocked()).toBe(true);
    }));

  it("refuses a key that does not open the wallet, in the store's words", async () => {
    const { service, keystore } = await setup();
    await service.turnOn(STRONG_PASSWORD, "p");
    keystore.stored = new Uint8Array(32).fill(7);
    expect(await service.unlock("p")).toEqual({
      kind: "refused",
      problem: walletCopy.store.keyRefused,
    });
    expect(isUnlocked()).toBe(false);
  });

  it("turns itself off and says why when the enrolment changed", async () => {
    const { service, keystore } = await setup();
    await service.turnOn(STRONG_PASSWORD, "p");
    keystore.answer = { kind: "invalidated" };
    expect(await service.unlock("p")).toEqual({ kind: "changed" });
    expect(service.setting()).toBe("changed");
    expect(keystore.stored).toBeNull();
  });

  it("falls back to the password, silently, on a cancelled prompt", async () => {
    const { service, keystore } = await setup();
    await service.turnOn(STRONG_PASSWORD, "p");
    keystore.answer = { kind: "cancelled" };
    expect(await service.unlock("p")).toEqual({ kind: "declined" });
    expect(service.setting()).toBe("on");
  });

  it("deletes the key when turned off or forgotten for a reset", async () => {
    const { service, keystore } = await setup();
    await service.turnOn(STRONG_PASSWORD, "p");
    await service.turnOff();
    expect(keystore.stored).toBeNull();
    expect(service.setting()).toBe("off");
    await service.turnOn(STRONG_PASSWORD, "p");
    await service.forget();
    expect(keystore.stored).toBeNull();
    expect(service.setting()).toBe("off");
  });

  describe("changing the password", () => {
    it("hands the keystore the new key, which then opens the wallet", () =>
      withRealKeyDerivation(async () => {
        const { service, keystore } = await setup();
        await service.turnOn(STRONG_PASSWORD, "p");
        const before = keystore.stored!.slice();
        expect(await service.changePassword(STRONG_PASSWORD, NEXT_PASSWORD, "p")).toEqual({
          outcome: "changed",
          notice: null,
        });
        expect(keystore.stored).toHaveLength(32);
        expect(keystore.stored).not.toEqual(before);
        lock();
        expect(await service.unlock("p")).toEqual({ kind: "unlocked" });
        lock();
        expect(await unlock(STRONG_PASSWORD)).toBe(walletCopy.store.wrongPassword);
        expect(await unlock(NEXT_PASSWORD)).toBeNull();
      }));

    it("undoes the change when the keystore does not take the new key", async () => {
      const { service, keystore } = await setup();
      await service.turnOn(STRONG_PASSWORD, "p");
      const before = keystore.stored!.slice();
      keystore.refuseStore = true;
      expect(await service.changePassword(STRONG_PASSWORD, NEXT_PASSWORD, "p")).toEqual({
        outcome: "unchanged",
        reason: walletCopy.store.rekeyRefused,
      });
      expect(keystore.stored).toEqual(before);
      expect(service.setting()).toBe("on");
      expect(await unlock(NEXT_PASSWORD)).toBe(walletCopy.store.wrongPassword);
      expect(await service.unlock("p")).toEqual({ kind: "unlocked" });
      lock();
      expect(await unlock(STRONG_PASSWORD)).toBeNull();
    });

    it("turns itself off when the change stood but the keystore kept the old key", async () => {
      const { vault, service, keystore } = await setup();
      await service.turnOn(STRONG_PASSWORD, "p");
      keystore.store = async () => {
        // The keystore refuses, and the vault then refuses the write that would undo the change.
        vault.refuseWrites = true;
        return false;
      };
      const result = await service.changePassword(STRONG_PASSWORD, NEXT_PASSWORD, "p");
      vault.refuseWrites = false;
      expect(result).toEqual({ outcome: "changed", notice: walletCopy.store.rekeyNotUndone });
      expect(service.setting()).toBe("off");
      expect(keystore.stored).toBeNull();
      expect(await unlock(NEXT_PASSWORD)).toBeNull();
    });

    it("leaves the keystore alone while biometric unlock is off", async () => {
      const { service, keystore } = await setup();
      expect(await service.changePassword(STRONG_PASSWORD, NEXT_PASSWORD, "p")).toEqual({
        outcome: "changed",
        notice: null,
      });
      expect(keystore.stored).toBeNull();
    });
  });
});
