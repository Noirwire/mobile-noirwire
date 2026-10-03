import { STORAGE_KEY, walletExists } from "@noirwire/shared/wallet";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import {
  forgetWallet,
  installTestPlatform,
  renderWith,
  storedLockedWallet,
  testServices,
} from "../testServices";
import { confirmsReset, ResetScreen } from "./ResetScreen";

afterEach(async () => {
  await forgetWallet();
});

const typeField = () => screen.getByLabelText("Type RESET to confirm");

describe("ResetScreen", () => {
  it("enables Delete only for the exact word", async () => {
    installTestPlatform();
    await renderWith(await testServices(), <ResetScreen onCancel={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/deletes the wallet from this phone/);
    const remove = () => screen.getByRole("button", { name: "Delete this wallet" });
    expect(remove()).toBeDisabled();
    await fireEvent.changeText(typeField(), "reset");
    expect(remove()).toBeDisabled();
    await fireEvent.changeText(typeField(), " RESET ");
    expect(remove()).toBeEnabled();
    expect(confirmsReset("RESETS")).toBe(false);
  });

  it("deletes the wallet, the biometric setting with it, and keeps the analytics choice", async () => {
    const { vault, events } = installTestPlatform();
    await storedLockedWallet();
    const services = await testServices();
    await services.preferences.setAnalyticsEnabled(false);
    await services.preferences.setBiometric("on");
    await renderWith(services, <ResetScreen onCancel={jest.fn()} />);
    await fireEvent.changeText(typeField(), "RESET");
    await fireEvent.press(screen.getByRole("button", { name: "Delete this wallet" }));
    await waitFor(() => expect(walletExists()).toBe(false));
    expect(vault.peek(STORAGE_KEY)).toBeNull();
    expect(services.preferences.biometric()).toBe("off");
    expect(services.preferences.analyticsEnabled()).toBe(false);
    expect(events).toContainEqual({ event: "wallet_reset" });
  });

  it("says so when the phone keeps the wallet, and leaves it stored", async () => {
    const { vault } = installTestPlatform();
    await storedLockedWallet();
    const onRefused = jest.fn();
    vault.refuseWrites = true;
    await renderWith(
      await testServices(),
      <ResetScreen onCancel={jest.fn()} onRefused={onRefused} />,
    );
    await fireEvent.changeText(typeField(), "RESET");
    await fireEvent.press(screen.getByRole("button", { name: "Delete this wallet" }));
    expect(await screen.findByText(/could not be deleted from this phone/)).toBeOnTheScreen();
    expect(onRefused).toHaveBeenCalledTimes(1);
    expect(walletExists()).toBe(true);
    expect(vault.peek(STORAGE_KEY)).not.toBeNull();
    vault.refuseWrites = false;
  });

  it("cancels", async () => {
    installTestPlatform();
    const onCancel = jest.fn();
    await renderWith(await testServices(), <ResetScreen onCancel={onCancel} />);
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
