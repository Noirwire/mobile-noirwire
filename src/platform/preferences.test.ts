import { memoryVault } from "@noirwire/shared/testing";
import { vaultPreferences } from "./preferences";

describe("vaultPreferences", () => {
  it("reads analytics as off until loaded, then on by default", async () => {
    const preferences = vaultPreferences(memoryVault());
    expect(preferences.analyticsEnabled()).toBe(false);
    await preferences.load();
    expect(preferences.analyticsEnabled()).toBe(true);
    expect(preferences.biometric()).toBe("off");
  });

  it("keeps the analytics choice across a restart", async () => {
    const vault = memoryVault();
    await vaultPreferences(vault).setAnalyticsEnabled(false);
    const restarted = vaultPreferences(vault);
    await restarted.load();
    expect(restarted.analyticsEnabled()).toBe(false);
  });

  it("erases the biometric setting on reset and keeps the analytics choice", async () => {
    const vault = memoryVault();
    const preferences = vaultPreferences(vault);
    await preferences.setAnalyticsEnabled(false);
    await preferences.setBiometric("on");
    expect(await preferences.clearForReset()).toBe(true);
    const restarted = vaultPreferences(vault);
    await restarted.load();
    expect(restarted.biometric()).toBe("off");
    expect(restarted.analyticsEnabled()).toBe(false);
  });

  it("says when a choice could not be stored, and tells subscribers of every change", async () => {
    const vault = memoryVault();
    const preferences = vaultPreferences(vault);
    const listener = jest.fn();
    preferences.subscribe(listener);
    vault.refuseWrites = true;
    expect(await preferences.setBiometric("changed")).toBe(false);
    expect(preferences.biometric()).toBe("changed");
    expect(listener).toHaveBeenCalled();
  });
});
