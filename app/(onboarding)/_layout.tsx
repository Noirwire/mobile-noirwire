import { Stack } from "expo-router";
import { stackScreenOptions } from "@/navigation/stackOptions";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ title: "Create a wallet" }} />
      <Stack.Screen name="import" options={{ title: "Import a wallet" }} />
      <Stack.Screen name="set-password" options={{ title: "Set a password" }} />
    </Stack>
  );
}
