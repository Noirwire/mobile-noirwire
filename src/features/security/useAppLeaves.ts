import { useEffect, useEffectEvent } from "react";
import { AppState } from "react-native";

/** Runs `onLeave` each time the app goes to the background or becomes inactive. */
export function useAppLeaves(onLeave: () => void) {
  const leave = useEffectEvent(onLeave);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") leave();
    });
    return () => subscription.remove();
  }, []);
}
