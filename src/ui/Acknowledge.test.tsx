import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Acknowledge } from "./Acknowledge";
import { Button } from "./Button";

function Gated({ onContinue }: { onContinue: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <Acknowledge label="I have saved these words." checked={saved} onChange={setSaved} />
      <Button label="Continue" disabled={!saved} onPress={onContinue} />
    </>
  );
}

describe("Acknowledge", () => {
  it("is a checkbox named by its sentence and reports the new state", async () => {
    const onChange = jest.fn();
    await render(
      <Acknowledge label="I understand this links them" checked={false} onChange={onChange} />,
    );
    const box = screen.getByRole("checkbox", { name: "I understand this links them" });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("unchecks when pressed while checked", async () => {
    const onChange = jest.fn();
    await render(<Acknowledge label="Saved" checked onChange={onChange} />);
    expect(screen.getByRole("checkbox", { name: "Saved" })).toBeChecked();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Saved" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("ignores presses while disabled", async () => {
    const onChange = jest.fn();
    await render(<Acknowledge label="Saved" checked={false} disabled onChange={onChange} />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Saved" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "Saved" })).toBeDisabled();
  });

  it("gates the primary action until it is checked", async () => {
    const onContinue = jest.fn();
    await render(<Gated onContinue={onContinue} />);
    const button = screen.getByRole("button", { name: "Continue" });
    await fireEvent.press(button);
    expect(onContinue).not.toHaveBeenCalled();
    expect(button).toBeDisabled();

    await fireEvent.press(screen.getByRole("checkbox", { name: "I have saved these words." }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
