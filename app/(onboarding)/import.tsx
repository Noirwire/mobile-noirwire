import { useRouter } from "expo-router";
import { getPlatform } from "@noirwire/shared/platform";
import { importSourceView } from "@noirwire/shared/presentation";
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
        // With nothing found there is nothing to choose between: the result says so.
        const { skipped } = importSourceView(resolution);
        if (!skipped) return router.push("/import-source");
        flow.choose(skipped.scheme);
        router.push("/import-result");
      }}
    />
  );
}
