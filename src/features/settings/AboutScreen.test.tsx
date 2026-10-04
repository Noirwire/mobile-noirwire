import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { installTestPlatform } from "../testServices";
import { AboutScreen } from "./AboutScreen";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock("expo-linking", () => ({ openURL: jest.fn(() => Promise.resolve(true)) }));

describe("AboutScreen", () => {
  beforeEach(() => {
    installTestPlatform();
  });

  it("copies the version and build on a long press, for support", async () => {
    await render(<AboutScreen version="1.0.0" build="12" onOpenRisks={jest.fn()} />);
    await fireEvent(screen.getByLabelText("Version, 1.0.0"), "longPress");
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("1.0.0 (12)");
  });

  it("opens a mail to the help contact, the website over https, and the risks page", async () => {
    const onOpenRisks = jest.fn();
    await render(<AboutScreen version="1.0.0" build="12" onOpenRisks={onOpenRisks} />);
    const [help, website] = screen.getAllByRole("link");
    await fireEvent.press(help);
    expect(Linking.openURL).toHaveBeenLastCalledWith(expect.stringMatching(/^mailto:\S+@\S+$/));
    await fireEvent.press(website);
    expect(Linking.openURL).toHaveBeenLastCalledWith(expect.stringMatching(/^https:\/\/\S+$/));
    await fireEvent.press(screen.getByRole("button", { name: "Risks" }));
    expect(onOpenRisks).toHaveBeenCalledTimes(1);
  });
});
