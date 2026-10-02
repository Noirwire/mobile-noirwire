import { fireEvent, render, screen } from "@testing-library/react-native";
import { useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { readScannedText, MAX_SCANNED_LENGTH } from "./scannedText";
import { CAMERA_PURPOSE } from "./CameraAccess";
import { Scanner } from "./Scanner";

jest.mock("expo-camera", () => {
  const { View } = jest.requireActual("react-native");
  return {
    useCameraPermissions: jest.fn(),
    CameraView: (props: object) => <View testID="camera" {...props} />,
  };
});

jest.mock("expo-clipboard", () => ({ getStringAsync: jest.fn() }));

const permissions = useCameraPermissions as jest.Mock;
const HINT = "Point the camera at the recipient's address code.";

function withPermission(granted: boolean, canAskAgain: boolean, request = jest.fn()) {
  permissions.mockReturnValue([
    { granted, canAskAgain, status: granted ? "granted" : "denied" },
    request,
  ]);
  return request;
}

beforeEach(() => jest.clearAllMocks());

describe("readScannedText", () => {
  it("passes a trimmed string and refuses anything else", () => {
    expect(readScannedText("  abc \n")).toBe("abc");
    expect(readScannedText("")).toBeNull();
    expect(readScannedText("   ")).toBeNull();
    expect(readScannedText(42)).toBeNull();
    expect(readScannedText(undefined)).toBeNull();
    expect(readScannedText("x".repeat(MAX_SCANNED_LENGTH + 1))).toBeNull();
  });
});

describe("Scanner", () => {
  it("explains the camera plainly and asks for it when it can", async () => {
    const request = withPermission(false, true);
    await render(<Scanner hint={HINT} onRead={jest.fn()} />);
    expect(screen.getByText(CAMERA_PURPOSE)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Allow camera" }));
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("camera")).toBeNull();
  });

  it("when permission is denied, points to settings and keeps paste working", async () => {
    const request = withPermission(false, false);
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue("  pasted-address  ");
    const onRead = jest.fn();
    await render(<Scanner hint={HINT} onRead={onRead} />);

    expect(screen.getByText("Camera access is off.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Open settings" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Allow camera" })).toBeNull();
    expect(screen.queryByTestId("camera")).toBeNull();
    expect(request).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Paste instead" }));
    expect(onRead).toHaveBeenCalledWith("pasted-address");
  });

  it("reports nothing for an empty or unreadable clipboard", async () => {
    withPermission(false, false);
    (Clipboard.getStringAsync as jest.Mock).mockRejectedValue(new Error("denied"));
    const onRead = jest.fn();
    await render(<Scanner hint={HINT} onRead={onRead} />);
    await fireEvent.press(screen.getByRole("button", { name: "Paste instead" }));
    expect(onRead).not.toHaveBeenCalled();
  });

  it("hands over a scanned string once, and nothing that is not text", async () => {
    withPermission(true, true);
    const onRead = jest.fn();
    await render(<Scanner hint={HINT} onRead={onRead} />);
    expect(screen.getByText(HINT)).toBeOnTheScreen();
    const camera = screen.getByTestId("camera");

    await fireEvent(camera, "barcodeScanned", { data: " solana:Example ", type: "qr" });
    await fireEvent(camera, "barcodeScanned", { data: "solana:Example", type: "qr" });
    await fireEvent(camera, "barcodeScanned", { data: 7, type: "qr" });
    await fireEvent(camera, "barcodeScanned", { data: "", type: "qr" });

    expect(onRead).toHaveBeenCalledTimes(1);
    expect(onRead).toHaveBeenCalledWith("solana:Example");
  });

  it("shows only an empty frame while the permission is still being read", async () => {
    permissions.mockReturnValue([null, jest.fn()]);
    await render(<Scanner hint={HINT} onRead={jest.fn()} />);
    expect(screen.queryByTestId("camera")).toBeNull();
    expect(screen.queryByText(CAMERA_PURPOSE)).toBeNull();
    expect(screen.getByRole("button", { name: "Paste instead" })).toBeOnTheScreen();
  });
});
