import { addressLines } from "@noirwire/shared/presentation";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { copySecret } from "@/ui/secretClipboard";
import { renderScreen, unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { AddMoneySheet } from "./AddMoneySheet";

jest.mock("@/ui/secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

afterEach(() => forgetWallet());

describe("AddMoneySheet", () => {
  it("says the three steps, with the funding wallet address already shown inside the second", async () => {
    const { events } = installTestPlatform();
    const wallet = await unlockedWallet();
    const on = { onClose: jest.fn(), onOpenCosts: jest.fn() };
    await renderScreen(await testServices(), <AddMoneySheet {...on} />);
    expect(screen.getByText("Add digital dollars")).toBeOnTheScreen();
    expect(screen.getAllByRole("header").map((header) => header.props.children)).toEqual([
      "Add digital dollars",
      "Get USDC",
      "Send it to your funding wallet",
      "Move it into a portfolio",
    ]);
    expect(
      screen.getByText(
        "USDC is a digital dollar: 1 USDC = $1. NoirWire cannot take card payments yet. Buy USDC in any app or service that can send it on the Solana network. No account with us is needed.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/A private move is not linked.*It costs 0\.1% \+ \$0\.20\./),
    ).toBeOnTheScreen();
    expect(screen.getByText(addressLines(wallet.funding.address).join("\n"))).toBeOnTheScreen();
    expect(screen.getByText("Network: Solana")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Show/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Copy funding wallet address" }));
    expect(copySecret).toHaveBeenCalledWith(wallet.funding.address);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeOnTheScreen();
    await waitFor(() =>
      expect(events).toContainEqual({ event: "address_copied", props: { what: "funding" } }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "What does it cost?" }));
    expect(on.onOpenCosts).toHaveBeenCalledTimes(1);
  });

  it("may be captured in a screenshot: it asks for no capture protection", async () => {
    installTestPlatform();
    await unlockedWallet();
    jest.mocked(preventScreenCaptureAsync).mockClear();
    await renderScreen(
      await testServices(),
      <AddMoneySheet onClose={jest.fn()} onOpenCosts={jest.fn()} />,
    );
    expect(screen.getByText("Network: Solana")).toBeOnTheScreen();
    expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
  });
});
