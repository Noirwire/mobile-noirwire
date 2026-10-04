import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { copySecret } from "@/ui/secretClipboard";
import { renderScreen, unlockedWallet } from "../portfolio/testWallet";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { ReceiveSheet } from "./ReceiveSheet";

jest.mock("@/ui/secretClipboard", () => ({ copySecret: jest.fn(() => Promise.resolve()) }));

afterEach(() => forgetWallet());

describe("ReceiveSheet", () => {
  it("shows a portfolio's address at once, with its own warning, and copies it", async () => {
    const { events } = installTestPlatform();
    const wallet = await unlockedWallet((w) => ({
      ...w,
      portfolios: w.portfolios.map((p) => ({ ...p, label: "Investing" })),
    }));
    const onClose = jest.fn();
    await renderScreen(
      await testServices(),
      <ReceiveSheet portfolioId={wallet.portfolios[0].id} onClose={onClose} />,
    );
    expect(screen.getByText("Receive in Investing")).toBeOnTheScreen();
    expect(screen.getByText(/ties the sender to this portfolio/)).toBeOnTheScreen();
    expect(screen.getByRole("image", { name: "QR code of Investing's address" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Share/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Copy address" }));
    expect(copySecret).toHaveBeenCalledWith(wallet.portfolios[0].address);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeOnTheScreen();
    expect(events).toContainEqual({ event: "dialog_opened", props: { dialog: "receive" } });
    await waitFor(() =>
      expect(events).toContainEqual({ event: "address_copied", props: { what: "portfolio" } }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Close Receive in Investing" }));
    expect(onClose).toHaveBeenCalled();
  });
});
