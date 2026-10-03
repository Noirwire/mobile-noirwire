import { useRouter } from "expo-router";
import { getPlatform } from "@noirwire/shared/platform";
import { useEffect } from "react";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { WelcomeScreen } from "@/features/onboarding/WelcomeScreen";

export default function Welcome() {
  const router = useRouter();
  const flow = useOnboardingFlow();
  useEffect(() => getPlatform().track("onboarding_step", { step: "welcome" }), []);

  return (
    <WelcomeScreen
      onCreate={() => {
        flow.startCreate();
        router.push("/create");
      }}
      onImport={() => router.push("/import")}
      onLookAround={() => router.push("/look-around")}
      onOpenKit={__DEV__ ? () => router.push("/dev/ui") : undefined}
    />
  );
}
