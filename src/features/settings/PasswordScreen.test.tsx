import { createWallet, lock, storeNewWallet, unlock } from "@noirwire/shared/wallet";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { STRONG_PASSWORD, forgetWallet, installTestPlatform } from "../testServices";
import { PasswordScreen } from "./PasswordScreen";

afterEach(() => forgetWallet());

async function setup() {
  const { events } = installTestPlatform();
  const draft = createWallet();
  await storeNewWallet(draft.wallet, draft.phrase, STRONG_PASSWORD);
  await render(<PasswordScreen />);
  return events;
}

async function fillNewPassword() {
  await fireEvent.press(screen.getByRole("button", { name: "Suggest a passphrase" }));
  await screen.findByText("Strong password.");
  return screen.getByLabelText("New password").props.value as string;
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
    await fireEvent.changeText(screen.getByLabelText("Current password"), "not my password");
    await fireEvent.press(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Your current password is not right.")).toBeOnTheScreen();
    lock();
    expect(await unlock(STRONG_PASSWORD)).toBeNull();
  });

  it("re-encrypts under the new password, says so and clears the fields", async () => {
    const events = await setup();
    const next = await fillNewPassword();
    await fireEvent.changeText(screen.getByLabelText("Current password"), STRONG_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText(/^Password changed\./)).toBeOnTheScreen();
    expect(screen.getByLabelText("Current password").props.value).toBe("");
    expect(events).toContainEqual({ event: "password_changed" });
    lock();
    expect(await unlock(STRONG_PASSWORD)).not.toBeNull();
    expect(await unlock(next)).toBeNull();
  });
});
