import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { REPEAT_INTERVAL_MS, Stepper } from "./Stepper";

function Controlled({ start, onChange }: { start: number; onChange?: (value: number) => void }) {
  const [value, setValue] = useState(start);
  return (
    <Stepper
      label="NVDAx share in percent"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const increase = () => screen.getByRole("button", { name: "Increase NVDAx share in percent" });
const decrease = () => screen.getByRole("button", { name: "Decrease NVDAx share in percent" });

afterEach(() => jest.useRealTimers());

describe("Stepper", () => {
  it("is an adjustable control with its value, bounds and actions", async () => {
    await render(<Controlled start={50} />);
    const control = screen.getByRole("adjustable", { name: "NVDAx share in percent" });
    expect(control.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 50,
      text: "50 percent",
    });
    expect(control.props.accessibilityActions).toEqual([
      { name: "increment" },
      { name: "decrement" },
    ]);
  });

  it("moves by five a press", async () => {
    const onChange = jest.fn();
    await render(<Controlled start={50} onChange={onChange} />);
    await fireEvent.press(increase());
    await fireEvent.press(increase());
    await fireEvent.press(decrease());
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([55, 60, 55]);
  });

  it("answers the screen reader's increment and decrement actions", async () => {
    const onChange = jest.fn();
    await render(<Controlled start={50} onChange={onChange} />);
    const control = screen.getByRole("adjustable", { name: "NVDAx share in percent" });
    await fireEvent(control, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    await fireEvent(control, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([55, 50]);
  });

  it("stops at the bounds and disables the button that would pass them", async () => {
    const onChange = jest.fn();
    await render(<Controlled start={97} onChange={onChange} />);
    await fireEvent.press(increase());
    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(increase()).toBeDisabled();
    expect(decrease()).toBeEnabled();
  });

  it("disables minus at zero", async () => {
    await render(<Controlled start={0} />);
    expect(decrease()).toBeDisabled();
  });

  it("repeats while held and stops at the bound", async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    await render(<Controlled start={80} onChange={onChange} />);
    await fireEvent(increase(), "longPress");
    await act(() => jest.advanceTimersByTime(REPEAT_INTERVAL_MS * 10));
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([85, 90, 95, 100]);
  });

  it("stops repeating when let go", async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    await render(<Controlled start={50} onChange={onChange} />);
    await fireEvent(decrease(), "longPress");
    await act(() => jest.advanceTimersByTime(REPEAT_INTERVAL_MS * 2));
    await fireEvent(decrease(), "pressOut");
    await act(() => jest.advanceTimersByTime(REPEAT_INTERVAL_MS * 5));
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([45, 40]);
  });

  it("takes a typed value, rounded and clamped, when the field is left", async () => {
    const onChange = jest.fn();
    await render(<Controlled start={50} onChange={onChange} />);
    const input = screen.getByDisplayValue("50");
    await fireEvent(input, "focus");
    await fireEvent.changeText(input, "180");
    await fireEvent(input, "blur");
    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(screen.getByDisplayValue("100")).toBeOnTheScreen();
  });
});
