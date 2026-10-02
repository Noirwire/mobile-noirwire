import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { Alert, type AlertButton } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button } from "./Button";
import { DISCARD_TITLE } from "./confirmDiscard";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function renderSheet(open: boolean, onClose = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Sheet open={open} onClose={onClose} title="Review">
        <Text>Sheet body</Text>
      </Sheet>
    </SafeAreaProvider>,
  );
}

type Options = Partial<ComponentProps<typeof Sheet>>;

function renderStep(options: Options) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Sheet open onClose={jest.fn()} title="Send" {...options}>
        <Text>Step body</Text>
      </Sheet>
    </SafeAreaProvider>,
  );
}

const backdrop = () => screen.getByLabelText("Close", { includeHiddenElements: true });

/** The host element carrying the system back handler (Android back, iOS escape). */
function modal(view: Awaited<ReturnType<typeof renderStep>>) {
  const [host] = view.container.queryAll((node) => typeof node.props.onRequestClose === "function");
  return host;
}

afterEach(() => jest.restoreAllMocks());

describe("Sheet", () => {
  it("mounts nothing while closed", async () => {
    await renderSheet(false);
    expect(screen.queryByText("Sheet body")).toBeNull();
  });

  it("shows its title and children while open", async () => {
    await renderSheet(true);
    expect(screen.getByRole("header", { name: "Review" })).toBeOnTheScreen();
    expect(screen.getByText("Sheet body")).toBeOnTheScreen();
  });

  it("closes from its close button and from the backdrop", async () => {
    const onClose = jest.fn();
    await renderSheet(true, onClose);
    await fireEvent.press(screen.getByRole("button", { name: "Close Review" }));
    // The sheet is modal, so a screen reader skips the backdrop behind it.
    await fireEvent.press(screen.getByLabelText("Close", { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("unmounts its children when it closes", async () => {
    const view = await renderSheet(true);
    await view.rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <Sheet open={false} onClose={jest.fn()} title="Review">
          <Text>Sheet body</Text>
        </Sheet>
      </SafeAreaProvider>,
    );
    expect(screen.queryByText("Sheet body")).toBeNull();
  });

  it("holds the step's primary action in its footer", async () => {
    await renderStep({ footer: <Button label="Review" onPress={jest.fn()} /> });
    expect(screen.getByRole("button", { name: "Review" })).toBeOnTheScreen();
  });

  it("leads with Back from the second step and drops the close control", async () => {
    const onBack = jest.fn();
    const onClose = jest.fn();
    await renderStep({ onBack, onClose });
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Close Send" })).toBeNull();
  });

  it("goes one step back on the system back, before ever leaving", async () => {
    const onBack = jest.fn();
    const onClose = jest.fn();
    const view = await renderStep({ onBack, onClose });
    await fireEvent(modal(view), "requestClose");
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cannot be dismissed or stepped back while an action is in flight", async () => {
    const onClose = jest.fn();
    const onBack = jest.fn();
    const view = await renderStep({ busy: true, onClose, onBack });
    expect(screen.queryByRole("button", { name: "Close Send" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await fireEvent.press(backdrop());
    await fireEvent(modal(view), "requestClose");
    expect(onClose).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("asks before discarding entered input, and keeps it on Keep editing", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const onClose = jest.fn();
    await renderStep({ dirty: true, onClose });

    await fireEvent.press(screen.getByRole("button", { name: "Close Send" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(DISCARD_TITLE, undefined, expect.any(Array));

    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((button) => button.text)).toEqual(["Keep editing", "Discard"]);
    buttons[0].onPress?.();
    expect(onClose).not.toHaveBeenCalled();
    buttons[1].onPress?.();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks from the scrim too when there is input", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const onClose = jest.fn();
    await renderStep({ dirty: true, onClose });
    await fireEvent.press(backdrop());
    expect(alert).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
