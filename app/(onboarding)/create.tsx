import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { getPlatform } from "@noirwire/shared/platform";
import { useCallback, useEffect, useState } from "react";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { PhraseScreen } from "@/features/onboarding/PhraseScreen";

export default function CreatePhrase() {
  const router = useRouter();
  const { draft } = useOnboardingFlow();
  // Leaving this screen remounts it, so the grid is concealed again on return.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => () => setVisit((count) => count + 1), []));
  useEffect(() => getPlatform().track("onboarding_step", { step: "phrase" }), []);

  if (!draft) return <Redirect href="/welcome" />;
  return (
    <PhraseScreen key={visit} words={draft.phrase} onContinue={() => router.push("/confirm")} />
  );
}
