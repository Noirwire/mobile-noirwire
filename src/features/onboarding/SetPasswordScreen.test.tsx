import { onboardingCopy } from "@noirwire/shared/copy";
import { STORAGE_KEY, createWallet, getSnapshot, isUnlocked } from "@noirwire/shared/wallet";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { forgetWallet, installTestPlatform, renderWith, testServices } from "../testServices";
import { SetPasswordScreen } from "./SetPasswordScreen";

afterEach(() => forgetWallet());

const newField = () => screen.getByLabelText("New password");
const confirmField = () => screen.getByLabelText("Confirm password");

describe("SetPasswordScreen", () => {
  it("holds a short or guessable password back, with the reason", async () => {
    installTestPlatform();
    await renderWith(
      await testServices(),
      <SetPasswordScreen draft={createWallet()} origin="create" onSaved={jest.fn()} />,
    );
    await fireEvent.changeText(newField(), "short");
    expect(await screen.findByText("Use at least 12 characters.")).toBeOnTheScreen();
    await fireEvent.changeText(newField(), "password1234");
    expect(await screen.findByText(/Too easy to guess/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Encrypt and finish" })).toBeDisabled();
  });

  it("asks for matching entries", async () => {
    installTestPlatform();
    await renderWith(
      await testServices(),
      <SetPasswordScreen draft={createWallet()} origin="create" onSaved={jest.fn()} />,
    );
    await fireEvent.changeText(newField(), "harbor-velvet-orbit-canyon-meadow");
    await fireEvent.changeText(confirmField(), "harbor-velvet");
    expect(screen.getByText("Both entries must match.")).toBeOnTheScreen();
  });

  it("suggests a visible passphrase and saves the created wallet encrypted, naming its portfolio", async () => {
    const { vault, events } = installTestPlatform();
    const onSaved = jest.fn();
    await renderWith(
      await testServices(),
      <SetPasswordScreen draft={createWallet()} origin="create" onSaved={onSaved} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Suggest a passphrase" }));
    expect(newField().props.value).toMatch(/^[a-z]+(-[a-z]+){4}$/);
    expect(newField().props.secureTextEntry).toBe(false);
    expect(screen.getByText(/Write it down somewhere safe/)).toBeOnTheScreen();
    expect(await screen.findByText("Strong password.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Encrypt and finish" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^[a-z-]+$/)));
    expect(isUnlocked()).toBe(true);
    expect(getSnapshot()?.portfolios[0].label).toBe(onboardingCopy.firstPortfolioLabel);
    expect(vault.peek(STORAGE_KEY)).toMatch(/"ciphertext"/);
    expect(events).toContainEqual({ event: "wallet_created" });
  });

  it("says when the phone would not save the wallet", async () => {
    const { vault } = installTestPlatform();
    vault.refuseWrites = true;
    await renderWith(
      await testServices(),
      <SetPasswordScreen draft={createWallet()} origin="import" onSaved={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Suggest a passphrase" }));
    await screen.findByText("Strong password.");
    await fireEvent.press(screen.getByRole("button", { name: "Encrypt and finish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This phone would not save the wallet (storage is full or blocked). Nothing was changed.",
    );
    vault.refuseWrites = false;
  });
});
