import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from "expo-screen-capture";
import type { ComponentProps } from "react";
import { Alert, type AlertButton } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Sheet } from "./Sheet";
import { Text } from "./Text";
import { CAPTURE_PROTECTION_LIMIT_MS } from "./useCaptureProtection";

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

  it("asks before discarding entered input, saying what is lost, and keeps it on the cancel choice", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const onClose = jest.fn();
    await renderStep({ dirty: true, onClose });

    await fireEvent.press(screen.getByRole("button", { name: "Close Send" }));
    expect(onClose).not.toHaveBeenCalled();
    const [title, body] = alert.mock.calls[0];
    expect(title).toMatch(/\S/);
    expect(body).toMatch(/\S/);

    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((button) => button.style)).toEqual(["cancel", "destructive"]);
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

  it("opens a sheet that can show a secret only once its window is kept out of captures", async () => {
    let protect!: () => void;
    (preventScreenCaptureAsync as jest.Mock).mockImplementationOnce(
      () => new Promise<void>((resolve) => (protect = resolve)),
    );
    (allowScreenCaptureAsync as jest.Mock).mockClear();
    const view = await renderStep({ secure: true });
    expect(screen.queryByText("Step body")).toBeNull();
    await act(async () => protect());
    expect(screen.getByText("Step body")).toBeOnTheScreen();
    expect(allowScreenCaptureAsync).not.toHaveBeenCalled();
    await view.unmount();
    expect(allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it("stays closed when the system refuses the protection, and opens on a Try again that succeeds", async () => {
    (preventScreenCaptureAsync as jest.Mock).mockRejectedValueOnce(new Error("unsupported"));
    const onClose = jest.fn();
    await renderStep({ secure: true, onClose });
    expect(
      await screen.findByText(
        "This can't be shown safely right now, so it is kept hidden. Try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Step body")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Step body")).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("can be closed from the refusal, which never shows the secret", async () => {
    (preventScreenCaptureAsync as jest.Mock).mockRejectedValue(new Error("unsupported"));
    const onClose = jest.fn();
    await renderStep({ secure: true, onClose });
    await fireEvent.press(await screen.findByRole("button", { name: "Close Send" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Step body")).toBeNull();
    (preventScreenCaptureAsync as jest.Mock).mockImplementation(() => Promise.resolve());
  });

  it("stays closed when the system never answers, and says so after the limit", async () => {
    jest.useFakeTimers();
    (preventScreenCaptureAsync as jest.Mock).mockReturnValueOnce(new Promise(() => undefined));
    await renderStep({ secure: true });
    expect(screen.queryByText("Step body")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    await act(() => jest.advanceTimersByTimeAsync(CAPTURE_PROTECTION_LIMIT_MS));
    expect(screen.getByRole("button", { name: "Try again" })).toBeOnTheScreen();
    expect(screen.queryByText("Step body")).toBeNull();
    jest.useRealTimers();
  });

  it("asks for no protection for a sheet that shows no secret", async () => {
    (preventScreenCaptureAsync as jest.Mock).mockClear();
    await renderStep({});
    expect(screen.getByText("Step body")).toBeOnTheScreen();
    expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
  });
});
