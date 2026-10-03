import { addScreenshotListener } from "expo-screen-capture";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export const SCREENSHOT_WARNING =
  "A screenshot was just taken. If it shows your words, anyone with your photos can read them. Delete it.";

/**
 * iOS cannot reliably block a screenshot, so on a phrase screen it is
 * noticed after the fact and the person is told what to do (spec 3.6).
 * True once a screenshot was taken while `active`.
 */
export function useScreenshotWarning(active: boolean): boolean {
  const [taken, setTaken] = useState(false);
  useEffect(() => {
    if (!active || Platform.OS !== "ios") return;
    const subscription = addScreenshotListener(() => setTaken(true));
    return () => subscription.remove();
  }, [active]);
  return taken;
}
