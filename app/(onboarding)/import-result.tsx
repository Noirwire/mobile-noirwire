import { Redirect, useRouter } from "expo-router";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { ResultScreen } from "@/features/onboarding/ResultScreen";

export default function ImportResult() {
  const router = useRouter();
  const { draft, resolution } = useOnboardingFlow();
  if (!draft || !resolution) return <Redirect href="/import" />;
  return (
    <ResultScreen
      activity={resolution[draft.wallet.derivationScheme]}
      fundingAddress={draft.wallet.funding.address}
      onContinue={() => router.push("/set-password")}
      onOtherSet={() => router.back()}
    />
  );
}
