import { WAITING_DELAY_MS } from "@noirwire/shared/presentation";
import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TopLoader } from "./TopLoader";
import { topLoaderStore } from "./topLoaderStore";

// Jest hoists this above the imports above, so TopLoader reads the mock.
jest.mock("./useReducedMotion", () => ({ useReducedMotion: () => true }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

beforeEach(() => {
  jest.useFakeTimers();
  topLoaderStore.reset();
});
afterEach(() => jest.useRealTimers());

describe("TopLoader under Reduce Motion", () => {
  it("holds to a gentle pulse instead of a sliding light", async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <TopLoader />
      </SafeAreaProvider>,
    );
    await act(async () => topLoaderStore.add());
    await act(async () => jest.advanceTimersByTime(WAITING_DELAY_MS));
    expect(screen.getByTestId("top-loader-fill")).toBeOnTheScreen();
    expect(screen.queryByTestId("top-loader-light")).toBeNull();
  });
});
