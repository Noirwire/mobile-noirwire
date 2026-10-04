import { memoryVault } from "@noirwire/shared/testing";
import { STORAGE_KEY } from "@noirwire/shared/wallet";
import { plainSessionStore } from "./sessionStore";

describe("plainSessionStore", () => {
  it("keeps one value under its own key, outside the wallet record", async () => {
    const storage = memoryVault();
    const store = plainSessionStore(storage);
    expect(await store.get()).toBeNull();
    await store.set('{"accessToken":"a"}');
    expect(await store.get()).toBe('{"accessToken":"a"}');
    expect(storage.keys()).toEqual(["noirwire.mobile.session"]);
    expect(storage.keys()).not.toContain(STORAGE_KEY);
  });

  it("survives a restart and is gone once removed", async () => {
    const storage = memoryVault();
    await plainSessionStore(storage).set("kept");
    const restarted = plainSessionStore(storage);
    expect(await restarted.get()).toBe("kept");
    await restarted.remove();
    expect(await restarted.get()).toBeNull();
    expect(storage.keys()).toEqual([]);
  });

  it("throws when the storage cannot be read or written, which reads as nothing stored", async () => {
    const storage = memoryVault();
    const store = plainSessionStore(storage);
    storage.refuseWrites = true;
    await expect(store.set("x")).rejects.toThrow();
    storage.unavailable = true;
    await expect(store.get()).rejects.toThrow();
  });
});
