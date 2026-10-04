import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DEV_KIT_LABEL, DevKitLink } from "@/dev/DevKitLink";
import { PHONE_METRICS } from "../network/testMoney";
import { WelcomeScreen } from "./WelcomeScreen";

const globals = globalThis as { __DEV__?: boolean };

describe("WelcomeScreen", () => {
  it("offers exactly three ways in, and each leads where it says", async () => {
    const onAction = jest.fn();
    await render(<WelcomeScreen onAction={onAction} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      "Create a wallet",
      "Restore a wallet",
      "Explore trackers",
    ]);
    for (const button of buttons) await fireEvent.press(button);
    expect(onAction.mock.calls).toEqual([["create"], ["restore"], ["explore"]]);
  });

  it("has no link to the UI kit in its own column, in any build", async () => {
    await render(<WelcomeScreen onAction={jest.fn()} />);
    expect(screen.queryByRole("button", { name: DEV_KIT_LABEL })).toBeNull();
    expect(screen.queryByText(/UI kit/)).toBeNull();
  });
});

describe("DevKitLink", () => {
  const render_ = (onPress = jest.fn()) =>
    render(
      <SafeAreaProvider initialMetrics={PHONE_METRICS}>
        <DevKitLink onPress={onPress} />
      </SafeAreaProvider>,
    );

  afterEach(() => {
    globals.__DEV__ = true;
  });

  it("opens the UI kit in a development build", async () => {
    const onPress = jest.fn();
    await render_(onPress);
    await fireEvent.press(screen.getByRole("button", { name: DEV_KIT_LABEL }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws nothing at all in a production render", async () => {
    globals.__DEV__ = false;
    const view = await render_();
    expect(screen.queryByRole("button", { name: DEV_KIT_LABEL })).toBeNull();
    expect(JSON.stringify(view.toJSON())).not.toContain("UI kit");
  });
});
