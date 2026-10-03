import { Stack } from "expo-router";
import { stackScreenOptions } from "@/navigation/stackOptions";

export default function VisitorLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="look-around" options={{ title: "Markets" }} />
      <Stack.Screen name="tracker/[symbol]" options={{ title: "" }} />
    </Stack>
  );
}
