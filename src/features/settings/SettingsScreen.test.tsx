import { createWallet, isUnlocked, storeNewWallet, updateWallet } from "@noirwire/shared/wallet";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import {
  STRONG_PASSWORD,
  forgetWallet,
  installTestPlatform,
  memoryKeystore,
  renderWith,
  testServices,
} from "../testServices";
import { SettingsScreen } from "./SettingsScreen";

afterEach(() => forgetWallet());

async function unlockedWallet() {
  const draft = createWallet();
  await storeNewWallet(draft.wallet, draft.phrase, STRONG_PASSWORD);
}

const touchId = () => memoryKeystore("Touch ID");

describe("SettingsScreen", () => {
  it("lists security, privacy, about and the danger zone, and opens each page", async () => {
    installTestPlatform();
    await unlockedWallet();
    const onOpen = jest.fn();
    await renderWith(await testServices(), <SettingsScreen onOpen={onOpen} appVersion="1.0.0" />);
    for (const [label, page] of [
      ["Recovery phrase", "recovery-phrase"],
      ["Password", "password"],
      ["Privacy and your funds", "privacy"],
      ["Risks", "risks"],
      ["About NoirWire, 1.0.0", "about"],
      ["Reset wallet", "reset"],
    ] as const) {
      await fireEvent.press(screen.getByRole("button", { name: label }));
      expect(onOpen).toHaveBeenLastCalledWith(page);
    }
  });

  it("locks at once on Lock now", async () => {
    const { events } = installTestPlatform();
    await unlockedWallet();
    await renderWith(
      await testServices(),
      <SettingsScreen onOpen={jest.fn()} appVersion="1.0.0" />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Lock now" }));
    expect(isUnlocked()).toBe(false);
    expect(events).toContainEqual({ event: "wallet_locked", props: { by: "manual" } });
  });

  it("turns analytics off and on at once", async () => {
    installTestPlatform();
    await unlockedWallet();
    const services = await testServices();
    await renderWith(services, <SettingsScreen onOpen={jest.fn()} appVersion="1.0.0" />);
    const toggle = () => screen.getByRole("switch", { name: "Usage analytics" });
    expect(toggle()).toBeChecked();
    await fireEvent.press(toggle());
    expect(services.preferences.analyticsEnabled()).toBe(false);
    expect(toggle()).not.toBeChecked();
  });

  it("hides biometric unlock on a device with no biometric method", async () => {
    installTestPlatform();
    await unlockedWallet();
    await renderWith(await testServices(), <SettingsScreen onOpen={jest.fn()} appVersion="1" />);
    await act(async () => undefined);
    expect(screen.queryByRole("switch", { name: /^Unlock with/ })).toBeNull();
  });

  it("turns biometric unlock on only after the password, and off without it", async () => {
    installTestPlatform();
    await unlockedWallet();
    const keystore = touchId();
    const services = await testServices({ keystore });
    await renderWith(services, <SettingsScreen onOpen={jest.fn()} appVersion="1" />);
    const toggle = await screen.findByRole("switch", { name: "Unlock with Touch ID" });
    await fireEvent.press(toggle);
    await fireEvent.changeText(screen.getByLabelText("Enter your password to turn it on"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Turn on" }));
    expect(await screen.findByText("That password does not match this wallet.")).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText("Enter your password to turn it on"),
      STRONG_PASSWORD,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Turn on" }));
    await waitFor(() => expect(services.preferences.biometric()).toBe("on"));
    expect(keystore.stored).toHaveLength(32);
    await fireEvent.press(screen.getByRole("switch", { name: "Unlock with Touch ID" }));
    await waitFor(() => expect(services.preferences.biometric()).toBe("off"));
    expect(keystore.stored).toBeNull();
  });

  it("says when biometrics changed on the device", async () => {
    installTestPlatform();
    await unlockedWallet();
    const services = await testServices({ keystore: touchId() });
    await services.preferences.setBiometric("changed");
    await renderWith(services, <SettingsScreen onOpen={jest.fn()} appVersion="1" />);
    expect(
      await screen.findByText(
        "Touch ID settings changed on this phone, so this was turned off. Turn it on again to keep using it.",
      ),
    ).toBeOnTheScreen();
  });

  it("says when changes are not being saved on this phone", async () => {
    const { vault } = installTestPlatform();
    await unlockedWallet();
    await renderWith(await testServices(), <SettingsScreen onOpen={jest.fn()} appVersion="1" />);
    vault.refuseWrites = true;
    await act(async () => {
      await updateWallet((wallet) => ({ ...wallet, watchlist: [] }));
    });
    expect(screen.getByText(/Changes are not being saved on this phone/)).toBeOnTheScreen();
    vault.refuseWrites = false;
  });
});
