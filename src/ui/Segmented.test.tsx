import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { Segmented } from "./Segmented";

beforeEach(() => jest.clearAllMocks());

const RANGES = ["1D", "1W", "1M"] as const;

describe("Segmented", () => {
  it("marks only the current option as checked", async () => {
    await render(
      <Segmented label="Chart range" options={RANGES} value="1W" onChange={jest.fn()} />,
    );
    expect(screen.getByRole("radio", { name: "1W" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "1D" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "1M" })).not.toBeChecked();
  });

  it("reports the option that was pressed", async () => {
    const onChange = jest.fn();
    await render(<Segmented label="Chart range" options={RANGES} value="1W" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("radio", { name: "1M" }));
    expect(onChange).toHaveBeenCalledWith("1M");
  });

  it("gives a selection haptic when the choice changes, and none for the current option", async () => {
    const onChange = jest.fn();
    await render(<Segmented label="Chart range" options={RANGES} value="1W" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("radio", { name: "1W" }));
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("radio", { name: "1D" }));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });
});
