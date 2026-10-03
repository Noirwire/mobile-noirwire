import { Stack } from "expo-router";
import { OnboardingFlowProvider } from "@/features/onboarding/OnboardingFlow";
import { stackScreenOptions } from "@/navigation/stackOptions";

const UNDER_A_BACK_BUTTON = { title: "" };

export default function OnboardingLayout() {
  return (
    <OnboardingFlowProvider>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={UNDER_A_BACK_BUTTON} />
        <Stack.Screen name="confirm" options={UNDER_A_BACK_BUTTON} />
        <Stack.Screen name="import" options={UNDER_A_BACK_BUTTON} />
        <Stack.Screen name="import-source" options={UNDER_A_BACK_BUTTON} />
        <Stack.Screen name="import-result" options={UNDER_A_BACK_BUTTON} />
        <Stack.Screen name="set-password" options={UNDER_A_BACK_BUTTON} />
        <Stack.Screen name="biometric" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </OnboardingFlowProvider>
  );
}
