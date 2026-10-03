import { fireEvent, render, screen } from "@testing-library/react-native";
import { WelcomeScreen } from "./WelcomeScreen";

describe("WelcomeScreen", () => {
  it("says what NoirWire is and offers the three ways in", async () => {
    const handlers = { onCreate: jest.fn(), onImport: jest.fn(), onLookAround: jest.fn() };
    await render(<WelcomeScreen {...handlers} />);
    expect(
      screen.getByRole("header", {
        name: "Keep your investing separate from your everyday wallet.",
      }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Create my wallet" }));
    await fireEvent.press(screen.getByRole("button", { name: "Import an existing wallet" }));
    await fireEvent.press(screen.getByRole("button", { name: "Look around first" }));
    expect(handlers.onCreate).toHaveBeenCalledTimes(1);
    expect(handlers.onImport).toHaveBeenCalledTimes(1);
    expect(handlers.onLookAround).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/stay on this phone/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Open the UI kit" })).toBeNull();
  });
});
