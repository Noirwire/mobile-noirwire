import { walletCopy } from "@noirwire/shared/copy";
import { createWallet, lock, storeNewWallet, unlock } from "@noirwire/shared/wallet";
import { fireEvent, screen } from "@testing-library/react-native";
import type { BiometricKeystore } from "@/platform/biometricKeystore";
import {
  STRONG_PASSWORD,
  forgetWallet,
  installTestPlatform,
  memoryKeystore,
  renderWith,
  testServices,
} from "../testServices";
import { PasswordScreen } from "./PasswordScreen";
import { withRealKeyDerivation } from "../../../jest/keyDerivation";

afterEach(() => forgetWallet());

/** A change that also hands a key to the keystore derives the key more than once. */
const SLOW = { timeout: 8_000 };

async function setup(keystore?: BiometricKeystore) {
  const { events, vault } = installTestPlatform();
  const draft = createWallet();
  await storeNewWallet(draft.wallet, draft.phrase, STRONG_PASSWORD);
  const services = await testServices({ keystore });
  if (keystore) await services.biometric.turnOn(STRONG_PASSWORD, "p");
  await renderWith(services, <PasswordScreen />);
  return { events, vault, services };
}

async function fillNewPassword() {
  await fireEvent.press(screen.getByRole("button", { name: "Suggest a password" }));
  await screen.findByText("Strong password.");
  return screen.getByLabelText("New password").props.value as string;
}

async function submit(current = STRONG_PASSWORD) {
  await fireEvent.changeText(screen.getByLabelText("Current password"), current);
  await fireEvent.press(screen.getByRole("button", { name: "Change password" }));
}

describe("PasswordScreen", () => {
  it("needs the current password and a strong, confirmed new one", async () => {
    await setup();
    const change = () => screen.getByRole("button", { name: "Change password" });
    expect(change()).toBeDisabled();
    await fillNewPassword();
    expect(change()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Current password"), STRONG_PASSWORD);
    expect(change()).toBeEnabled();
  });

  it("says when the current password is not right, and the old one keeps working", async () => {
    await setup();
    await fillNewPassword();
    await submit("not my password");
    expect(await screen.findByText("Your current password is not right.")).toBeOnTheScreen();
    lock();
    expect(await unlock(STRONG_PASSWORD)).toBeNull();
  });

  it("re-encrypts under the new password, says so and clears the fields", () =>
    withRealKeyDerivation(async () => {
      const { events } = await setup();
      const next = await fillNewPassword();
      await submit();
      expect(await screen.findByText(/^Password changed\./)).toBeOnTheScreen();
      expect(screen.getByLabelText("Current password").props.value).toBe("");
      expect(events).toContainEqual({ event: "password_changed" });
      lock();
      expect(await unlock(STRONG_PASSWORD)).not.toBeNull();
      expect(await unlock(next)).toBeNull();
    }));

  it("says why nothing changed when the new record could not be stored", async () => {
    const { vault, events } = await setup();
    await fillNewPassword();
    vault.refuseWrites = true;
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Nothing was changed\.$/);
    vault.refuseWrites = false;
    expect(events).not.toContainEqual({ event: "password_changed" });
    lock();
    expect(await unlock(STRONG_PASSWORD)).toBeNull();
  });

  it("says it cannot tell which password works when the result could not be read back", async () => {
    const { vault, events } = await setup();
    await fillNewPassword();
    // The write fails, and so does the read that would say whether it landed.
    const update = vault.update;
    vault.update = (key, change) => {
      vault.unavailable = true;
      return update(key, change);
    };
    await submit();
    expect(await screen.findByText(walletCopy.store.passwordChangeUnknown)).toBeOnTheScreen();
    expect(screen.getByLabelText("Current password").props.value).toBe("");
    expect(screen.queryByText(/^Password changed\./)).toBeNull();
    expect(events).not.toContainEqual({ event: "password_changed" });
    vault.update = update;
    vault.unavailable = false;
    // Once the wallet can be read again the unknown change settles: nothing was written.
    await fillNewPassword();
    await submit();
    expect(await screen.findByText(/^Password changed\./)).toBeOnTheScreen();
  });

  it("gives the device keystore the new key while biometric unlock is on", async () => {
    const keystore = memoryKeystore();
    const { services } = await setup(keystore);
    const before = keystore.stored!.slice();
    await fillNewPassword();
    await submit();
    expect(await screen.findByText(/^Password changed\./, {}, SLOW)).toBeOnTheScreen();
    expect(keystore.stored).not.toEqual(before);
    lock();
    expect(await services.biometric.unlock("p")).toEqual({ kind: "unlocked" });
  });

  it("keeps the old password, and says so, when the keystore did not take the new key", async () => {
    const keystore = memoryKeystore();
    await setup(keystore);
    const next = await fillNewPassword();
    keystore.refuseStore = true;
    await submit();
    expect(await screen.findByText(walletCopy.store.rekeyRefused, {}, SLOW)).toBeOnTheScreen();
    lock();
    expect(await unlock(next)).toBe(walletCopy.store.wrongPassword);
    expect(await unlock(STRONG_PASSWORD)).toBeNull();
  });
});
