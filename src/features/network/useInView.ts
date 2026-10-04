import { REFRESH_INTERVAL_MS } from "@noirwire/shared/domain";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";

const subscribeAppState = (onChange: () => void) => {
  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
};
const appInForeground = () => AppState.currentState !== "background";

/** A screen is in view while it has the focus and the app is in the foreground. */
export function useInView(focused: boolean): boolean {
  return useSyncExternalStore(subscribeAppState, appInForeground) && focused;
}

/**
 * The clock a screen measures its reads' age against. It moves once every
 * refresh interval while the screen is in view and stands still otherwise,
 * so on the way back a read is not called old before the refresh that the
 * return starts has ended. A failed refresh shows at once whatever the time.
 */
export function useScreenClock(inView: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [inView]);
  return now;
}
