import type { Activity } from "@noirwire/shared/platform";
import type { AppStateStatus } from "react-native";

type AppStateSource = {
  currentState: AppStateStatus;
  addEventListener(type: "change", listener: (state: AppStateStatus) => void): { remove(): void };
};

export type AppActivity = Activity & {
  /** A touch anywhere in the app: the root view's capture handler calls this. */
  noteInput(): void;
};

/**
 * What the idle lock counts from: a touch, or the app coming back to the
 * foreground. A return after the idle window is what locks a wallet whose
 * timer did not run while the phone slept, so the foreground event is
 * reported however long the app was away.
 */
export function appActivity(appState: AppStateSource): AppActivity {
  const listeners = new Set<() => void>();
  const fire = () => listeners.forEach((listener) => listener());
  let state = appState.currentState;
  appState.addEventListener("change", (next) => {
    if (next === "active" && state !== "active") fire();
    state = next;
  });
  return {
    subscribe(onActive) {
      listeners.add(onActive);
      return () => void listeners.delete(onActive);
    },
    noteInput: fire,
  };
}
