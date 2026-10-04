import { getSnapshot } from "@noirwire/shared/wallet";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { forgetWallet, installTestPlatform, renderWith, testServices } from "../testServices";
import { PHONE_METRICS, portfoliosWith as walletWith } from "../network/testMoney";
import { installFakePrices } from "../trade/testDoubles";
import { PieBuilderSheet } from "./PieBuilderSheet";

afterEach(async () => {
  jest.restoreAllMocks();
  await forgetWallet();
});

async function open(
  pie = [
    { symbol: "NVDAx", weight: 60 },
    { symbol: "SPYx", weight: 40 },
  ],
) {
  installTestPlatform();
  installFakePrices();
  const [id] = await walletWith([{ label: "Core", pie }]);
  const onClose = jest.fn();
  await renderWith(
    await testServices(),
    <SafeAreaProvider initialMetrics={PHONE_METRICS}>
      <PieBuilderSheet portfolioId={id} onClose={onClose} />
    </SafeAreaProvider>,
  );
  return { id, onClose };
}

describe("PieBuilderSheet", () => {
  it("shows the mix, its total and a Stepper per tracker, and saves without placing anything", async () => {
    const { id, onClose } = await open();
    expect(screen.getByText("100%")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Increase NVDAx share in percent" }));
    expect(screen.getByText("105%")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Save mix" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Split evenly" }));
    expect(screen.getByText("100%")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Save mix" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(getSnapshot()?.portfolios.find((p) => p.id === id)?.pie).toEqual([
      { symbol: "NVDAx", weight: 50 },
      { symbol: "SPYx", weight: 50 },
    ]);
    expect(getSnapshot()?.activity).toEqual([]);
  });

  it("adds a tracker from the chooser, leaving out the ones already in the mix, and removes one", async () => {
    await open();
    await fireEvent.changeText(screen.getByLabelText("Add another tracker"), "nvda");
    expect(screen.getByText("No matching investment.")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Add another tracker"), "tesla");
    await fireEvent.press(screen.getByRole("button", { name: "Tesla, TSLAx" }));
    expect(screen.getByText("Every tracker needs at least 1%.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Remove TSLAx" }));
    expect(screen.queryByText("Every tracker needs at least 1%.")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Remove SPYx" }));
    await fireEvent.press(screen.getByRole("button", { name: "Remove NVDAx" }));
    expect(screen.getByText("Add at least one tracker.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Pick the trackers for this pie")).toBeOnTheScreen();
  });

  it("says when saving failed", async () => {
    const { vault } = installTestPlatform();
    installFakePrices();
    const [id] = await walletWith([{ label: "Core", pie: [{ symbol: "NVDAx", weight: 100 }] }]);
    vault.refuseWrites = true;
    await renderWith(
      await testServices(),
      <SafeAreaProvider initialMetrics={PHONE_METRICS}>
        <PieBuilderSheet portfolioId={id} onClose={jest.fn()} />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save mix" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Nothing was changed/);
  });
});
