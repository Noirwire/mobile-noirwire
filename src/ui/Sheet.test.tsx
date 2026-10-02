import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function renderSheet(open: boolean, onClose = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Sheet open={open} onClose={onClose} title="Review">
        <Text>Sheet body</Text>
      </Sheet>
    </SafeAreaProvider>,
  );
}

describe("Sheet", () => {
  it("mounts nothing while closed", async () => {
    await renderSheet(false);
    expect(screen.queryByText("Sheet body")).toBeNull();
  });

  it("shows its title and children while open", async () => {
    await renderSheet(true);
    expect(screen.getByRole("header", { name: "Review" })).toBeOnTheScreen();
    expect(screen.getByText("Sheet body")).toBeOnTheScreen();
  });

  it("closes from its close button and from the backdrop", async () => {
    const onClose = jest.fn();
    await renderSheet(true, onClose);
    await fireEvent.press(screen.getByRole("button", { name: "Close Review" }));
    // The sheet is modal, so a screen reader skips the backdrop behind it.
    await fireEvent.press(screen.getByLabelText("Close", { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("unmounts its children when it closes", async () => {
    const view = await renderSheet(true);
    await view.rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <Sheet open={false} onClose={jest.fn()} title="Review">
          <Text>Sheet body</Text>
        </Sheet>
      </SafeAreaProvider>,
    );
    expect(screen.queryByText("Sheet body")).toBeNull();
  });
});
