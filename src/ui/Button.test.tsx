import { STILL_WORKING_AFTER_MS, WAITING_DELAY_MS } from "@noirwire/shared/presentation";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
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

  it("stops taking presses at once while loading, and shows its spinner only after a moment", async () => {
    jest.useFakeTimers();
    const onPress = jest.fn();
    await render(<Button label="Continue" loading loadingLabel="Saving..." onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Continue" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
    expect(screen.getByText("Continue")).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(WAITING_DELAY_MS));
    expect(screen.queryByText("Continue")).toBeNull();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeBusy();
    jest.useRealTimers();
  });

  it("adds a calm line under itself when the wait runs long", async () => {
    jest.useFakeTimers();
    await render(<Button label="Review" loading waitingFor="review" />);
    await act(() => jest.advanceTimersByTimeAsync(STILL_WORKING_AFTER_MS.review));
    expect(
      screen.getByText("Still preparing your review. Nothing has been sent."),
    ).toBeOnTheScreen();
    jest.useRealTimers();
  });
});
