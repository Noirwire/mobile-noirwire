import { Redirect, useRouter } from "expo-router";
import { getPlatform } from "@noirwire/shared/platform";
import { useEffect } from "react";
import { ConfirmScreen } from "@/features/onboarding/ConfirmScreen";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";

export default function ConfirmPhrase() {
  const router = useRouter();
  const { draft, quiz, setQuiz } = useOnboardingFlow();
  useEffect(() => getPlatform().track("onboarding_step", { step: "confirm" }), []);

  if (!draft || !quiz) return <Redirect href="/welcome" />;
  return (
    <ConfirmScreen
      words={draft.phrase}
      quiz={quiz}
      onQuizChange={setQuiz}
      onPassed={() => router.push("/set-password")}
      onShowPhrase={() => router.back()}
    />
  );
}
