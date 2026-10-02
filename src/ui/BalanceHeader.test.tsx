import { fireEvent, render, screen } from "@testing-library/react-native";
import { BalanceHeader } from "./BalanceHeader";
import { layout } from "./theme";

function layoutEvent(width: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height: 46 } } };
}

describe("BalanceHeader", () => {
  it("reads label, figure and change together", async () => {
    await render(<BalanceHeader label="Total value" value="$8,729.89" change="+$98.79 (1.2%)" />);
    expect(screen.getByLabelText("Total value, $8,729.89, +$98.79 (1.2%)")).toBeOnTheScreen();
  });

  it("leaves the change line out when there is none", async () => {
    await render(<BalanceHeader label="Total value" value="Value unavailable" unavailable />);
    expect(screen.getByLabelText("Total value, Value unavailable")).toBeOnTheScreen();
  });

  it("sets an unavailable figure at body size, not as a display number", async () => {
    await render(<BalanceHeader label="Total value" value="Value unavailable" unavailable />);
    expect(screen.getByText("Value unavailable")).toHaveStyle({ fontSize: 15 });
  });

  it("keeps its text out of the signature's zone", async () => {
    await render(<BalanceHeader label="Total value" value="$8,729.89" change="+$98.79" />);
    const copy = screen.getByLabelText("Total value, $8,729.89, +$98.79");
    expect(copy).toHaveStyle({ marginRight: layout.signature });
  });

  it("shrinks a long figure to its column instead of running past it", async () => {
    await render(<BalanceHeader label="Total value" value="$1,248,729.89" />);
    const [shown, measuring] = screen.getAllByText("$1,248,729.89", {
      includeHiddenElements: true,
    });
    await fireEvent(shown.parent!, "layout", layoutEvent(202));
    await fireEvent(measuring, "layout", layoutEvent(250));
    expect(screen.getAllByText("$1,248,729.89", { includeHiddenElements: true })[0]).toHaveStyle({
      fontSize: 42 * 0.8,
    });
  });

  it("leaves a figure that fits at full size", async () => {
    await render(<BalanceHeader label="Total value" value="$8.00" />);
    const [shown, measuring] = screen.getAllByText("$8.00", { includeHiddenElements: true });
    await fireEvent(shown.parent!, "layout", layoutEvent(300));
    await fireEvent(measuring, "layout", layoutEvent(90));
    expect(screen.getAllByText("$8.00", { includeHiddenElements: true })[0]).toHaveStyle({
      fontSize: 42,
    });
  });
});
