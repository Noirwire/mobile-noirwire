import { Stack } from "expo-router";
import { stackScreenOptions } from "../stackOptions";

/**
 * The stack inside the Home tab and inside the Markets tab: the tab's own
 * screen, with a portfolio's and a tracker's screens pushed onto it.
 */
export function DetailStack({ root }: { root: string }) {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name={root} options={{ headerShown: false }} />
      <Stack.Screen name="portfolio/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="markets/[symbol]" options={{ title: "Tracker" }} />
    </Stack>
  );
}
