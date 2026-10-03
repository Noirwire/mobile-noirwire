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

  it("reads a comma as the decimal separator in an amount field, and leaves other fields as typed", async () => {
    const onAmount = jest.fn();
    const onName = jest.fn();
    await render(
      <>
        <Field label="Amount in USDC" keyboardType="decimal-pad" onChangeText={onAmount} />
        <Field label="Portfolio name" onChangeText={onName} />
      </>,
    );
    await fireEvent.changeText(screen.getByLabelText("Amount in USDC"), "12,5");
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "Rainy day, maybe");
    expect(onAmount).toHaveBeenCalledWith("12.5");
    expect(onName).toHaveBeenCalledWith("Rainy day, maybe");
  });

  it("shows its error as an alert", async () => {
    await render(<Field label="Amount" error="Enter an amount in numbers." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount in numbers.");
  });
});
