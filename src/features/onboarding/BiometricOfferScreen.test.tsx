import { fireEvent, screen } from "@testing-library/react-native";
import type { BiometricKeystore } from "@/platform/biometricKeystore";
import { installTestPlatform, renderWith, testServices } from "../testServices";
import { BiometricOfferScreen } from "./BiometricOfferScreen";

beforeEach(() => installTestPlatform());

function faceId(stores: boolean): BiometricKeystore {
  return {
    method: async () => ({ name: "Face ID" }),
    store: async () => stores,
    read: async () => ({ kind: "cancelled" }),
    remove: async () => true,
  };
}

const access = { keyBitsFor: async () => new Uint8Array(32), unlockWithKeyBits: async () => null };

describe("BiometricOfferScreen", () => {
  it("offers the device's method by name, without claiming it replaces the password", async () => {
    const onDone = jest.fn();
    await renderWith(
      await testServices({ keystore: faceId(true), access }),
      <BiometricOfferScreen method="Face ID" password="pw" onDone={onDone} />,
    );
    expect(screen.getByRole("header", { name: "Unlock with Face ID?" })).toBeOnTheScreen();
    expect(screen.getByText(/Your password is still needed/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("turns it on and moves on", async () => {
    const onDone = jest.fn();
    const services = await testServices({ keystore: faceId(true), access });
    await renderWith(
      services,
      <BiometricOfferScreen method="Face ID" password="pw" onDone={onDone} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Use Face ID" }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(services.preferences.biometric()).toBe("on");
  });

  it("stays and says so when the prompt was cancelled", async () => {
    const onDone = jest.fn();
    await renderWith(
      await testServices({ keystore: faceId(false), access }),
      <BiometricOfferScreen method="Face ID" password="pw" onDone={onDone} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Use Face ID" }));
    expect(
      await screen.findByText("Face ID was not turned on. You can turn it on later in Settings."),
    ).toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });
});
