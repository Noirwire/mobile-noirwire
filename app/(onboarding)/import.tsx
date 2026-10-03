import { Stack, useRouter } from "expo-router";
import { getPlatform } from "@noirwire/shared/platform";
import { useEffect, useState } from "react";
import { ImportScreen } from "@/features/onboarding/ImportScreen";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";

export default function ImportPhrase() {
  const router = useRouter();
  const flow = useOnboardingFlow();
  const [busy, setBusy] = useState(false);
  useEffect(() => getPlatform().track("onboarding_step", { step: "import" }), []);

  return (
    <>
      <Stack.Screen options={{ headerBackVisible: !busy, gestureEnabled: !busy }} />
      <ImportScreen
        onBusyChange={setBusy}
        onFound={(words, resolution) => {
          flow.startImport(words, resolution);
          router.push("/import-source");
        }}
      />
    </>
  );
}
