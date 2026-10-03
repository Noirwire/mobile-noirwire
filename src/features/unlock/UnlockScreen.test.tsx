import { STORAGE_KEY, isUnlocked } from "@noirwire/shared/wallet";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { KeyRead } from "@/platform/biometricKeystore";
import { noteResetRefused } from "../reset/resetOutcome";
import {
  STRONG_PASSWORD,
  forgetWallet,
  installTestPlatform,
  memoryKeystore,
  renderWith,
  storedLockedWallet,
  testServices,
} from "../testServices";
import { UnlockScreen } from "./UnlockScreen";

afterEach(() => forgetWallet());

const passwordField = () => screen.getByLabelText("Password");

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
    async function biometricServices(answer: KeyRead | null = null) {
      const keystore = memoryKeystore();
      const services = await testServices({ keystore });
      await services.biometric.turnOn(STRONG_PASSWORD, "p");
      keystore.answer = answer;
      return services;
    }

    it("prompts at once and opens the wallet with the key the keystore released", async () => {
      installTestPlatform();
      await storedLockedWallet();
      await renderWith(await biometricServices(), <UnlockScreen onReset={jest.fn()} />);
      await waitFor(() => expect(isUnlocked()).toBe(true));
    });

    it("offers the method again after a cancelled prompt, and the password still works", async () => {
      installTestPlatform();
      await storedLockedWallet();
      await renderWith(
        await biometricServices({ kind: "cancelled" }),
        <UnlockScreen onReset={jest.fn()} />,
      );
      expect(await screen.findByRole("button", { name: "Use Face ID" })).toBeOnTheScreen();
      expect(isUnlocked()).toBe(false);
      await fireEvent.changeText(passwordField(), STRONG_PASSWORD);
      await fireEvent.press(screen.getByRole("button", { name: "Unlock" }));
      await waitFor(() => expect(isUnlocked()).toBe(true));
    });

    it("turns itself off and says why after the enrolment changed", async () => {
      installTestPlatform();
      await storedLockedWallet();
      const services = await biometricServices({ kind: "invalidated" });
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
      await renderWith(
        await biometricServices({ kind: "lockedOut" }),
        <UnlockScreen onReset={jest.fn()} />,
      );
      expect(
        await screen.findByText("Face ID is unavailable right now. Enter your password."),
      ).toBeOnTheScreen();
    });
  });
});
