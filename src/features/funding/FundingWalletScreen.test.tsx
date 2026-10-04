import { fireEvent, screen } from "@testing-library/react-native";
import { fakeChain, renderWithMoney, testMoney, walletWith } from "../network/testMoney";
import { SettingsScreen } from "../settings/SettingsScreen";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { FundingWalletScreen } from "./FundingWalletScreen";

afterEach(() => forgetWallet());

describe("FundingWalletScreen", () => {
  it("shows what is waiting and offers to move it, never the address", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain, { funding: 250 });
    const onMove = jest.fn();
    const onAddMoney = jest.fn();
    await renderWithMoney(
      await testServices(),
      testMoney(chain),
      <FundingWalletScreen onMove={onMove} onAddMoney={onAddMoney} />,
    );
    expect(await screen.findByLabelText("250.00 USDC waiting to be moved")).toBeOnTheScreen();
    expect(
      screen.getByText("Money sent here must be moved into a portfolio before you can invest."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(wallet.funding.address)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Move to portfolio" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add money" }));
    expect(onMove).toHaveBeenCalled();
    expect(onAddMoney).toHaveBeenCalled();
  });

  it("says nothing is waiting and holds Move back at a zero balance", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain, { funding: 0 });
    await renderWithMoney(
      await testServices(),
      testMoney(chain),
      <FundingWalletScreen onMove={jest.fn()} onAddMoney={jest.fn()} />,
    );
    expect(
      await screen.findByText("Nothing is waiting. Add money to your funding wallet first."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Move to portfolio" })).toBeDisabled();
  });

  it("is reached from Settings by a row carrying the funding wallet's cash", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain, { funding: 250 });
    const onOpen = jest.fn();
    await renderWithMoney(
      await testServices(),
      testMoney(chain),
      <SettingsScreen onOpen={onOpen} appVersion="1.0.0" />,
    );
    expect(screen.getByText("Wallet")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Funding wallet, 250.00 USDC" }));
    expect(onOpen).toHaveBeenCalledWith("funding-wallet");
  });
});
