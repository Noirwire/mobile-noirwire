import { render, screen } from "@testing-library/react-native";
import { QRCode } from "./QRCode";
import { QUIET_ZONE_MODULES, qrLayout } from "./qrLayout";

describe("QRCode", () => {
  it("is one image named for whose address it encodes", async () => {
    await render(<QRCode value="example" label="QR code of your funding address" />);
    expect(
      screen.getByRole("image", { name: "QR code of your funding address" }),
    ).toBeOnTheScreen();
  });
});

describe("qrLayout", () => {
  it.each([21, 29, 33, 57])(
    "leaves at least four modules of quiet zone around a %p-module code",
    (modules) => {
      const { matrix, quietZone } = qrLayout(220);
      expect(matrix + 2 * quietZone).toBeCloseTo(220);
      expect(quietZone / (matrix / modules) + 1e-9).toBeGreaterThanOrEqual(QUIET_ZONE_MODULES);
    },
  );
});
