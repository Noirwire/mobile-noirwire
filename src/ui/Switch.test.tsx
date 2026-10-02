import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { Switch } from "./Switch";

beforeEach(() => jest.clearAllMocks());

describe("Switch", () => {
  it("is one switch control that announces its state and caption", async () => {
    await render(
      <Switch label="Usage analytics" caption="Counts screens." value onValueChange={jest.fn()} />,
    );
    const control = screen.getByRole("switch", { name: "Usage analytics" });
    expect(control).toBeChecked();
    expect(control.props.accessibilityHint).toBe("Counts screens.");
  });

  it("flips from a tap anywhere on the row, with a selection haptic", async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch label="Unlock with Face ID" value={false} onValueChange={onValueChange} />,
    );
    await fireEvent.press(screen.getByRole("switch", { name: "Unlock with Face ID" }));
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", async () => {
    const onValueChange = jest.fn();
    await render(<Switch label="Off" value={false} disabled onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole("switch", { name: "Off" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
