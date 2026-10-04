import { fireEvent, render, screen } from "@testing-library/react-native";
import { Field } from "./Field";

describe("Field", () => {
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
