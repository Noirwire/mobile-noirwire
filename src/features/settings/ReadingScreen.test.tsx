import { render, screen } from "@testing-library/react-native";
import { PrivacyScreen, RisksScreen } from "./ReadingScreen";

describe("RisksScreen", () => {
  it("states each risk under its own heading, with nothing to accept", async () => {
    await render(<RisksScreen />);
    for (const heading of [
      "What a tracker is",
      "What the issuer controls",
      "What stays public",
      "Lending through Earn",
      "The software",
      "Your recovery phrase",
    ]) {
      expect(screen.getByRole("header", { name: heading })).toBeOnTheScreen();
    }
    expect(screen.getByText(/has not been independently audited/)).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("PrivacyScreen", () => {
  it("says what is public and who can see what", async () => {
    await render(<PrivacyScreen />);
    expect(screen.getByRole("header", { name: "What is public" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Who can see what" })).toBeOnTheScreen();
    expect(screen.getByText("NoirWire's relayer")).toBeOnTheScreen();
    expect(screen.queryByText(/anonymous|untraceable|hidden/i)).toBeNull();
  });
});
