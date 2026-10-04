import { useEffect } from "react";
import { topLoaderStore } from "./topLoaderStore";

/**
 * Switches the app's one top loader on for as long as `active` is true, and
 * off again the moment this is the last caller still holding it. Layered on
 * top of whatever `useWaiting` a screen already keeps for its own wait: pass
 * it the same boolean. Several callers can hold the bar on at once.
 */
export function useTopLoader(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    topLoaderStore.add();
    return () => topLoaderStore.remove();
  }, [active]);
}
