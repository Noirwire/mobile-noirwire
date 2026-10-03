import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import {
  STRONG_PASSWORD,
  forgetWallet,
  installTestPlatform,
  memoryKeystore,
  renderWith,
  storedLockedWallet,
  testServices,
} from "../testServices";
import { BiometricOfferScreen } from "./BiometricOfferScreen";

beforeEach(async () => {
  installTestPlatform();
  await storedLockedWallet();
});
afterEach(() => forgetWallet());

function faceId(stores: boolean) {
  const keystore = memoryKeystore();
  keystore.refuseStore = !stores;
  return keystore;
}

describe("BiometricOfferScreen", () => {
  it("offers the device's method by name, without claiming it replaces the password", async () => {
    const onDone = jest.fn();
    await renderWith(
      await testServices({ keystore: faceId(true) }),
      <BiometricOfferScreen method="Face ID" password={STRONG_PASSWORD} onDone={onDone} />,
    );
    expect(screen.getByRole("header", { name: "Unlock with Face ID?" })).toBeOnTheScreen();
    expect(screen.getByText(/Your password is still needed/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("turns it on and moves on", async () => {
    const onDone = jest.fn();
    const services = await testServices({ keystore: faceId(true) });
    await renderWith(
      services,
      <BiometricOfferScreen method="Face ID" password={STRONG_PASSWORD} onDone={onDone} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Use Face ID" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(services.preferences.biometric()).toBe("on");
  });

  it("stays and says so when the prompt was cancelled", async () => {
    const onDone = jest.fn();
    await renderWith(
      await testServices({ keystore: faceId(false) }),
      <BiometricOfferScreen method="Face ID" password={STRONG_PASSWORD} onDone={onDone} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Use Face ID" }));
    expect(
      await screen.findByText("Face ID was not turned on. You can turn it on later in Settings."),
    ).toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });
});
