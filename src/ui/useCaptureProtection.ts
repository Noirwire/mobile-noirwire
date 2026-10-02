import { allowScreenCaptureAsync, preventScreenCaptureAsync } from "expo-screen-capture";
import { useEffect, useId } from "react";
import { Platform } from "react-native";

/**
 * Asks the system to keep this content out of screenshots and recordings
 * while `active`. Reliable on Android; best effort on iOS; not available in a
 * browser, where it does nothing. A refusal never stops the screen rendering.
 */
export function useCaptureProtection(active: boolean) {
  const key = useId();
  useEffect(() => {
    if (!active || Platform.OS === "web") return;
    preventScreenCaptureAsync(key).catch(() => undefined);
    return () => {
      allowScreenCaptureAsync(key).catch(() => undefined);
    };
  }, [active, key]);
}
