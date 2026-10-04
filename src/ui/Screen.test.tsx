import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Field } from "./Field";
import { KEYBOARD_CLEARANCE, Screen } from "./Screen";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

describe("Screen", () => {
  it("scrolls with the keyboard, keeping room for the primary button under the focused field", async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <Screen>
          <Field label="Confirm password" />
        </Screen>
      </SafeAreaProvider>,
    );
    expect(screen.getByLabelText("Confirm password")).toBeOnTheScreen();
    expect(KEYBOARD_CLEARANCE).toBeGreaterThanOrEqual(52 + 32);
    let scroller = screen.getByLabelText("Confirm password").parent;
    while (scroller && scroller.type !== "RCTScrollView") scroller = scroller.parent;
    expect(scroller?.props.bottomOffset).toBe(KEYBOARD_CLEARANCE);
    expect(scroller?.props.keyboardShouldPersistTaps).toBe("handled");
  });
});
