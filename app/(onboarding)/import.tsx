import { useRouter } from "expo-router";
import { getPlatform } from "@noirwire/shared/platform";
import { useEffect } from "react";
import { ImportScreen } from "@/features/onboarding/ImportScreen";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";

export default function ImportPhrase() {
  const router = useRouter();
  const flow = useOnboardingFlow();
  useEffect(() => getPlatform().track("onboarding_step", { step: "import" }), []);

  return (
    <ImportScreen
      onFound={(words, resolution) => {
        flow.startImport(words, resolution);
        router.push("/import-source");
      }}
    />
  );
}
