import { fireEvent, render, screen } from "@testing-library/react-native";
import { ResultScreen } from "./ResultScreen";

const ADDRESS = "5aqYNsJsmRuasaFMMWAF2s94r1bTuXZC46A6Ro9C82GY";

describe("ResultScreen", () => {
  it("says what was found and shows the funding address only when asked, in groups of four", async () => {
    const handlers = { onContinue: jest.fn(), onOtherSet: jest.fn() };
    await render(
      <ResultScreen
        activity={{
          address: ADDRESS,
          balanceSol: 0,
          portfolios: [{ index: 1, address: ADDRESS, solBalance: 0 }],
          active: true,
        }}
        fundingAddress={ADDRESS}
        {...handlers}
      />,
    );
    expect(screen.getByText("Wallet reunited with its funds.")).toBeOnTheScreen();
    expect(
      screen.getByText("Found 1 portfolio this phrase already had on chain."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/5aqY/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Show funding address" }));
    expect(screen.getByText(/^5aqY NsJs mRua/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByText(/5aqY/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Open the other set instead" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(handlers.onOtherSet).toHaveBeenCalledTimes(1);
    expect(handlers.onContinue).toHaveBeenCalledTimes(1);
  });

  it("says plainly when nothing was found", async () => {
    await render(
      <ResultScreen
        activity={{ address: ADDRESS, balanceSol: 0, portfolios: [], active: false }}
        fundingAddress={ADDRESS}
        onContinue={jest.fn()}
        onOtherSet={jest.fn()}
      />,
    );
    expect(screen.getByText("Wallet imported.")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Nothing was found on chain for these addresses yet. Add money whenever you're ready.",
      ),
    ).toBeOnTheScreen();
  });
});
