import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { Button } from "./Button";

beforeEach(() => jest.clearAllMocks());

describe("Button", () => {
  it("calls onPress and gives a haptic for the primary action", async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it.each(["quiet", "danger"] as const)("gives no haptic for a %s button", async (variant) => {
    const onPress = jest.fn();
    await render(<Button label="Other" variant={variant} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Other" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it("does nothing when disabled, and says so to a screen reader", async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" disabled onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Continue" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it("replaces its label with a spinner while loading and ignores presses", async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" loading onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Continue" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
    expect(screen.queryByText("Continue")).toBeNull();
  });
});
