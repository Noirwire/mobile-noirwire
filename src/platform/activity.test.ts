import type { AppStateStatus } from "react-native";
import { appActivity } from "./activity";

function fakeAppState(initial: AppStateStatus) {
  let listener: (state: AppStateStatus) => void = () => undefined;
  return {
    currentState: initial,
    addEventListener: (_: "change", next: (state: AppStateStatus) => void) => {
      listener = next;
      return { remove: () => undefined };
    },
    become: (state: AppStateStatus) => listener(state),
  };
}

describe("appActivity", () => {
  it("reports a return to the foreground, once per return", () => {
    const appState = fakeAppState("active");
    const activity = appActivity(appState);
    const onActive = jest.fn();
    activity.subscribe(onActive);
    appState.become("inactive");
    appState.become("background");
    expect(onActive).not.toHaveBeenCalled();
    appState.become("active");
    appState.become("active");
    expect(onActive).toHaveBeenCalledTimes(1);
  });

  it("reports input from the root touch capture", () => {
    const activity = appActivity(fakeAppState("active"));
    const onActive = jest.fn();
    activity.subscribe(onActive);
    activity.noteInput();
    expect(onActive).toHaveBeenCalledTimes(1);
  });

  it("stops reporting to a listener that unsubscribed", () => {
    const appState = fakeAppState("background");
    const activity = appActivity(appState);
    const onActive = jest.fn();
    activity.subscribe(onActive)();
    activity.noteInput();
    appState.become("active");
    expect(onActive).not.toHaveBeenCalled();
  });
});
