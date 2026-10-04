import { fireEvent, render, screen } from "@testing-library/react-native";
import { Field } from "./Field";

describe("Field", () => {
  it("passes typed text to onChangeText", async () => {
    const onChangeText = jest.fn();
    await render(<Field label="Portfolio name" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "Long term");
    expect(onChangeText).toHaveBeenCalledWith("Long term");
  });

  it("hides a secure entry until asked to show it, and hides it again", async () => {
    await render(<Field label="Password" secure />);
    const input = screen.getByLabelText("Password");
    expect(input.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Show Password" }));
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole("button", { name: "Hide Password" }));
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  });

  it("offers no reveal control on an ordinary field", async () => {
    await render(<Field label="Portfolio name" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hands on an amount exactly as it was typed: the shared amount reading takes a comma or a period", async () => {
    const onAmount = jest.fn();
    await render(
      <Field label="Amount in USDC" keyboardType="decimal-pad" onChangeText={onAmount} />,
    );
    await fireEvent.changeText(screen.getByLabelText("Amount in USDC"), "12,5");
    expect(onAmount).toHaveBeenCalledWith("12,5");
  });

  it("is as many lines tall as it is asked to be, with the text starting at the top", async () => {
    await render(<Field label="Recovery phrase" lines={4} />);
    const field = screen.getByLabelText("Recovery phrase");
    expect(field.props.multiline).toBe(true);
    expect(field).toHaveStyle({ minHeight: 4 * 22 + 24, textAlignVertical: "top" });
  });

  it("shows its error as an alert", async () => {
    await render(<Field label="Amount" error="Enter an amount in numbers." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount in numbers.");
  });
});
