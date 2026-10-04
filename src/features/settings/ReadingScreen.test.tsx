import { render, screen } from "@testing-library/react-native";
import { CostsScreen, PrivacyScreen, RisksScreen } from "./ReadingScreen";

jest.mock("@noirwire/shared/infrastructure", () => ({
  ...jest.requireActual("@noirwire/shared/infrastructure"),
  noirwireFeeBps: () => 50,
}));

describe("CostsScreen", () => {
  it("states what each thing costs, from the figures the reviews charge by", async () => {
    await render(<CostsScreen />);
    for (const line of [
      "Buying or selling a tracker: 0.5% of the trade.",
      /^Moving money into a portfolio privately: 0\.1% \+ \$0\.20\./,
      "Network cost: a few cents, paid automatically from your USDC.",
      "Getting USDC from another service: that service may charge its own fee.",
      "The exact amount is always shown before you confirm.",
    ]) {
      expect(screen.getByText(line)).toBeOnTheScreen();
    }
  });
});

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
    expect(screen.queryByText(/untraceable|hidden/i)).toBeNull();
  });
});
