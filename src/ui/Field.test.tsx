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

  it("shows its error as an alert", async () => {
    await render(<Field label="Amount" error="Enter an amount in numbers." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount in numbers.");
  });
});
