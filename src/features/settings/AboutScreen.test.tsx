import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { AboutScreen } from "./AboutScreen";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

describe("AboutScreen", () => {
  it("shows the version, build, network, help contact and website, and copies the version on a long press", async () => {
    const onOpenRisks = jest.fn();
    await render(<AboutScreen version="1.0.0" build="12" onOpenRisks={onOpenRisks} />);
    expect(screen.getByText("Solana")).toBeOnTheScreen();
    expect(screen.getByLabelText("Help, ph1l1ph@proton.me")).toBeOnTheScreen();
    expect(screen.getByLabelText("Website, noirwire.com")).toBeOnTheScreen();
    await fireEvent(screen.getByLabelText("Version, 1.0.0"), "longPress");
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("1.0.0 (12)");
    expect(screen.getByText("Copied")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Risks" }));
    expect(onOpenRisks).toHaveBeenCalledTimes(1);
  });
});
