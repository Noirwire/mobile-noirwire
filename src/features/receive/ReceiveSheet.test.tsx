import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { copySecret } from "@/ui/secretClipboard";
import { renderScreen, unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { ReceiveSheet } from "./ReceiveSheet";

jest.mock("@/ui/secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

afterEach(() => forgetWallet());

describe("ReceiveSheet", () => {
  it("keeps the funding address hidden until Show address, then offers Copy", async () => {
    const { events } = installTestPlatform();
    const wallet = await unlockedWallet();
    await renderScreen(
      await testServices(),
      <ReceiveSheet target={{ kind: "funding", reveal: false }} onClose={jest.fn()} />,
    );
    expect(screen.getByText("Your funding address")).toBeOnTheScreen();
    expect(
      screen.getByText("This first transfer is public and may link the sending address to you."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Your funding address is hidden.")).toBeOnTheScreen();
    expect(screen.queryByRole("image", { name: "QR code of your funding address" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Show address" }));
    expect(
      screen.getByRole("image", { name: "QR code of your funding address" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(new RegExp(`^${wallet.funding.address.slice(0, 4)} `)),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Share/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Copy address" }));
    expect(copySecret).toHaveBeenCalledWith(wallet.funding.address);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeOnTheScreen();
    expect(events).toContainEqual({ event: "dialog_opened", props: { dialog: "receive" } });
    await waitFor(() =>
      expect(events).toContainEqual({ event: "address_copied", props: { what: "funding" } }),
    );
  });

  it("shows a portfolio's address at once, with its own warning", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet((w) => ({
      ...w,
      portfolios: w.portfolios.map((p) => ({ ...p, label: "Investing" })),
    }));
    const onClose = jest.fn();
    await renderScreen(
      await testServices(),
      <ReceiveSheet
        target={{ kind: "portfolio", id: wallet.portfolios[0].id }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Receive in Investing")).toBeOnTheScreen();
    expect(screen.getByText(/ties the sender to this portfolio/)).toBeOnTheScreen();
    expect(screen.getByRole("image", { name: "QR code of Investing's address" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Close Receive in Investing" }));
    expect(onClose).toHaveBeenCalled();
  });
});
