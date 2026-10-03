import { fireEvent, screen } from "@testing-library/react-native";
import { fakeChain, renderWithMoney, testMoney, walletWith } from "../network/testMoney";
import { SettingsScreen } from "../settings/SettingsScreen";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { FundingWalletScreen } from "./FundingWalletScreen";
import { fundOutcomeView, fundProgressView } from "./fundingView";

afterEach(() => forgetWallet());

describe("FundingWalletScreen", () => {
  it("shows what is waiting and offers to move it, never the address", async () => {
    installTestPlatform();
    const chain = fakeChain();
    const wallet = await walletWith(chain, { funding: 250 });
    const onMove = jest.fn();
    const onShowAddress = jest.fn();
    await renderWithMoney(
      await testServices(),
      testMoney(chain),
      <FundingWalletScreen onMove={onMove} onShowAddress={onShowAddress} />,
    );
    expect(await screen.findByLabelText("250.00 USDC waiting to be moved")).toBeOnTheScreen();
    expect(
      screen.getByText("Money sent here must be moved into a portfolio before you can invest."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(wallet.funding.address)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Move to a portfolio" }));
    await fireEvent.press(screen.getByRole("button", { name: "Show my funding address" }));
    expect(onMove).toHaveBeenCalled();
    expect(onShowAddress).toHaveBeenCalled();
  });

  it("says nothing is waiting and holds Move back at a zero balance", async () => {
    installTestPlatform();
    const chain = fakeChain();
    await walletWith(chain, { funding: 0 });
    await renderWithMoney(
      await testServices(),
      testMoney(chain),
      <FundingWalletScreen onMove={jest.fn()} onShowAddress={jest.fn()} />,
    );
    expect(
      await screen.findByText(
        "Nothing is waiting. Send USDC on Solana to your funding address to add money.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Move to a portfolio" })).toBeDisabled();
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

describe("fund view models", () => {
  it("names each stage in plain words, done by evidence only", () => {
    const view = fundProgressView({
      amount: 100,
      portfolioLabel: "Investing",
      completed: 1,
      slow: true,
    });
    expect(view.title).toBe("Moving 100.00 USDC into Investing");
    expect(view.steps.map((step) => [step.title, step.status])).toEqual([
      ["Sent to the private route", "done"],
      ["Waiting in the queue", "current"],
      ["Arrived in Investing", "waiting"],
    ]);
    expect(view.steps[1].caption).toBe(
      "Delivered after 2 to 15 seconds, split across several entries.",
    );
    expect(view.stillWorking).toBe(
      "Still working. You can leave this open; nothing more is needed from you.",
    );
  });

  it("calls a slow arrival still settling, not a failure", () => {
    const view = fundOutcomeView({
      outcome: "pending",
      amount: 100,
      arrived: 0,
      fee: 0.3,
      portfolioLabel: "Investing",
    });
    expect(view.title).toBe("Still settling");
    expect(view.close).toBe("Close");
    expect(view.publicView).toBeNull();
  });
});
