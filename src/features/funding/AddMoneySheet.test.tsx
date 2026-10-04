import { addressLines } from "@noirwire/shared/presentation";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { copySecret } from "@/ui/secretClipboard";
import { renderScreen, unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { AddMoneySheet } from "./AddMoneySheet";

jest.mock("@/ui/secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

afterEach(() => forgetWallet());

const costs = () => screen.getByRole("button", { name: "What does it cost?" });

describe("AddMoneySheet", () => {
  it("shows the funding wallet address at once, with nothing to tap first, and copies it", async () => {
    const { events } = installTestPlatform();
    const wallet = await unlockedWallet();
    await renderScreen(await testServices(), <AddMoneySheet onClose={jest.fn()} />);
    expect(screen.getByText(addressLines(wallet.funding.address).join("\n"))).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Show/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Copy funding wallet address" }));
    expect(copySecret).toHaveBeenCalledWith(wallet.funding.address);
    await waitFor(() =>
      expect(events).toContainEqual({ event: "address_copied", props: { what: "funding" } }),
    );
  });

  it("opens what it costs in place, closed at first, with the address still on screen", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet();
    const onClose = jest.fn();
    await renderScreen(await testServices(), <AddMoneySheet onClose={onClose} />);
    const address = addressLines(wallet.funding.address).join("\n");
    expect(costs()).toBeCollapsed();
    expect(screen.queryByText(/^Network cost:/)).toBeNull();
    await fireEvent.press(costs());
    expect(costs()).toBeExpanded();
    expect(
      screen.getByText(/^Moving money into a portfolio privately: 0\.1% \+ \$0\.20/),
    ).toBeOnTheScreen();
    expect(screen.getByText(address)).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("may be captured in a screenshot: it asks for no capture protection", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet();
    jest.mocked(preventScreenCaptureAsync).mockClear();
    await renderScreen(await testServices(), <AddMoneySheet onClose={jest.fn()} />);
    expect(screen.getByText(addressLines(wallet.funding.address).join("\n"))).toBeOnTheScreen();
    expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
  });
});
