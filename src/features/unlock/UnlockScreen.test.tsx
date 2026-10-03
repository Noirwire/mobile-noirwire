import { STORAGE_KEY, isUnlocked } from "@noirwire/shared/wallet";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { BiometricKeystore, KeyRead } from "@/platform/biometricKeystore";
import { noteResetRefused } from "../reset/resetOutcome";
import {
  STRONG_PASSWORD,
  forgetWallet,
  installTestPlatform,
  renderWith,
  storedLockedWallet,
  testServices,
} from "../testServices";
import { UnlockScreen } from "./UnlockScreen";

afterEach(() => forgetWallet());

const passwordField = () => screen.getByLabelText("Password");

function faceId(read: KeyRead): BiometricKeystore {
  return {
    method: async () => ({ name: "Face ID" }),
    store: async () => true,
    read: async () => read,
    remove: async () => true,
  };
}

describe("UnlockScreen", () => {
  it("shows nothing about the wallet, and keeps Unlock disabled until a password is typed", async () => {
    installTestPlatform();
    await storedLockedWallet();
    await renderWith(await testServices(), <UnlockScreen onReset={jest.fn()} />);
    expect(screen.getByRole("header", { name: "Unlock NoirWire" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Unlock" })).toBeDisabled();
    expect(screen.queryByText(/Investing|Portfolio|\$/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Face ID/ })).toBeNull();
  });

  it("says a wrong password does not match, and clears the field", async () => {
    const { events } = installTestPlatform();
    await storedLockedWallet();
    await renderWith(await testServices(), <UnlockScreen onReset={jest.fn()} />);
    await fireEvent.changeText(passwordField(), "not the password");
    await fireEvent.press(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByText("That password does not match this wallet.")).toBeOnTheScreen();
    expect(passwordField().props.value).toBe("");
    expect(isUnlocked()).toBe(false);
    expect(events).toContainEqual({ event: "unlock_failed" });
  });

  it("unlocks with the right password and counts it", async () => {
    const { events } = installTestPlatform();
    await storedLockedWallet();
    await renderWith(await testServices(), <UnlockScreen onReset={jest.fn()} />);
    await fireEvent.changeText(passwordField(), STRONG_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: "Unlock" }));
    await waitFor(() => expect(isUnlocked()).toBe(true));
    expect(events.map((entry) => entry.event)).toContain("wallet_unlocked");
  });

  it("opens nothing from a tampered record, which reads as a password that does not match", async () => {
    const { vault } = installTestPlatform();
    await storedLockedWallet();
    const envelope = JSON.parse(vault.peek(STORAGE_KEY)!);
    vault.writeFromElsewhere(STORAGE_KEY, JSON.stringify({ ...envelope, ciphertext: "AAAA" }));
    await renderWith(await testServices(), <UnlockScreen onReset={jest.fn()} />);
    await fireEvent.changeText(passwordField(), STRONG_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByText("That password does not match this wallet.")).toBeOnTheScreen();
  });

  it("leads to Reset with the forgotten-password guidance", async () => {
    installTestPlatform();
    await storedLockedWallet();
    const onReset = jest.fn();
    await renderWith(await testServices(), <UnlockScreen onReset={onReset} />);
    expect(screen.getByText(/It cannot be recovered. It never left this phone./)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Reset this wallet" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("says a refused reset left the wallet stored", async () => {
    installTestPlatform();
    await storedLockedWallet();
    noteResetRefused();
    await renderWith(await testServices(), <UnlockScreen onReset={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/still stored here, locked/);
  });

  describe("with biometric unlock on", () => {
    async function biometricServices(read: KeyRead) {
      const unlockWithKeyBits = jest.fn(async () => null);
      const services = await testServices({
        keystore: faceId(read),
        access: { keyBitsFor: async () => new Uint8Array(32), unlockWithKeyBits },
      });
      await services.preferences.setBiometric("on");
      return { services, unlockWithKeyBits };
    }

    it("prompts at once and opens with the released key", async () => {
      installTestPlatform();
      await storedLockedWallet();
      const { services, unlockWithKeyBits } = await biometricServices({
        kind: "key",
        bits: new Uint8Array(32),
      });
      await renderWith(services, <UnlockScreen onReset={jest.fn()} />);
      await waitFor(() => expect(unlockWithKeyBits).toHaveBeenCalledTimes(1));
      expect(screen.getByRole("button", { name: "Use Face ID" })).toBeOnTheScreen();
    });

    it("turns itself off and says why after the enrolment changed", async () => {
      installTestPlatform();
      await storedLockedWallet();
      const { services } = await biometricServices({ kind: "invalidated" });
      await renderWith(services, <UnlockScreen onReset={jest.fn()} />);
      expect(
        await screen.findByText(
          "Face ID settings changed on this phone, so it was turned off for NoirWire. Enter your password.",
        ),
      ).toBeOnTheScreen();
      expect(services.preferences.biometric()).toBe("changed");
      expect(screen.queryByRole("button", { name: "Use Face ID" })).toBeNull();
    });

    it("says biometrics are unavailable after a lockout", async () => {
      installTestPlatform();
      await storedLockedWallet();
      const { services } = await biometricServices({ kind: "lockedOut" });
      await renderWith(services, <UnlockScreen onReset={jest.fn()} />);
      expect(
        await screen.findByText("Face ID is unavailable right now. Enter your password."),
      ).toBeOnTheScreen();
    });
  });
});
