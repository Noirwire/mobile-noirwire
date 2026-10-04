import { WAITING_DELAY_MS } from "@noirwire/shared/presentation";
import { act, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TopLoader } from "./TopLoader";
import { topLoaderStore } from "./topLoaderStore";
import { useTopLoader } from "./useTopLoader";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function renderLoader(element: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>);
}

beforeEach(() => {
  jest.useFakeTimers();
  topLoaderStore.reset();
});
afterEach(() => jest.useRealTimers());

// `act(() => ...)` on a plain sync callback does not flush the render that
// topLoaderStore's listener schedules outside any React event; the async
// form does.
const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms));
const addWait = () => act(async () => topLoaderStore.add());
const removeWait = () => act(async () => topLoaderStore.remove());

describe("TopLoader", () => {
  it("shows nothing for a wait that has not yet run past the standard's delay", async () => {
    await renderLoader(<TopLoader />);
    await addWait();
    expect(screen.getByTestId("top-loader")).not.toBeBusy();
    await advance(WAITING_DELAY_MS - 1);
    expect(screen.getByTestId("top-loader")).not.toBeBusy();
  });

  it("turns busy on once a wait has run past the delay", async () => {
    await renderLoader(<TopLoader />);
    await addWait();
    await advance(WAITING_DELAY_MS);
    expect(screen.getByTestId("top-loader")).toBeBusy();
    expect(screen.getByRole("progressbar")).toBeOnTheScreen();
  });

  it("stays on while a second wait is still running, and only turns off once both have", async () => {
    await renderLoader(<TopLoader />);
    await addWait();
    await addWait();
    await advance(WAITING_DELAY_MS);
    expect(screen.getByTestId("top-loader")).toBeBusy();

    await removeWait();
    expect(screen.getByTestId("top-loader")).toBeBusy();

    await removeWait();
    expect(screen.getByTestId("top-loader")).not.toBeBusy();
  });

  it("hides again, with nothing left busy, the moment the one wait holding it on ends", async () => {
    await renderLoader(<TopLoader />);
    await addWait();
    await advance(WAITING_DELAY_MS);
    expect(screen.getByTestId("top-loader")).toBeBusy();

    await removeWait();
    expect(screen.getByTestId("top-loader")).not.toBeBusy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("slides a light rather than pulsing when motion is not reduced", async () => {
    await renderLoader(<TopLoader />);
    await addWait();
    await advance(WAITING_DELAY_MS);
    expect(screen.getByTestId("top-loader-light")).toBeOnTheScreen();
    expect(screen.queryByTestId("top-loader-fill")).toBeNull();
  });

  it("switches several waits on and off through useTopLoader without double-counting", async () => {
    function Waiter({ active }: { active: boolean }) {
      useTopLoader(active);
      return null;
    }
    const { rerender } = await renderLoader(
      <>
        <TopLoader />
        <Waiter active={true} />
        <Waiter active={true} />
      </>,
    );
    await advance(WAITING_DELAY_MS);
    expect(screen.getByTestId("top-loader")).toBeBusy();

    await act(async () =>
      rerender(
        <SafeAreaProvider initialMetrics={METRICS}>
          <TopLoader />
          <Waiter active={false} />
          <Waiter active={true} />
        </SafeAreaProvider>,
      ),
    );
    expect(screen.getByTestId("top-loader")).toBeBusy();

    await act(async () =>
      rerender(
        <SafeAreaProvider initialMetrics={METRICS}>
          <TopLoader />
          <Waiter active={false} />
          <Waiter active={false} />
        </SafeAreaProvider>,
      ),
    );
    expect(screen.getByTestId("top-loader")).not.toBeBusy();
  });

  it("embeds flush with a sheet's own top edge instead of the device status bar", async () => {
    await renderLoader(<TopLoader embedded />);
    expect(screen.getByTestId("top-loader")).toHaveStyle({ top: 0 });
  });

  it("sits under the status bar at the root", async () => {
    await renderLoader(<TopLoader />);
    expect(screen.getByTestId("top-loader")).toHaveStyle({ top: METRICS.insets.top });
  });
});
