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
  it("moves on at Not now, leaving it off", async () => {
    const onDone = jest.fn();
    const services = await testServices({ keystore: faceId(true) });
    await renderWith(
      services,
      <BiometricOfferScreen method="Face ID" password={STRONG_PASSWORD} onDone={onDone} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(services.preferences.biometric()).not.toBe("on");
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
    expect(await screen.findByText(/was not turned on/)).toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });
});
