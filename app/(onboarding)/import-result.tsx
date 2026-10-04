import { importSourceView } from "@noirwire/shared/presentation";
import { Redirect, useRouter } from "expo-router";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { ResultScreen } from "@/features/onboarding/ResultScreen";
import { useServices } from "@/features/services";

export default function ImportResult() {
  const router = useRouter();
  const flow = useOnboardingFlow();
  const { lookFurther, useOnline } = useServices();
  const online = useOnline();
  const { draft, resolution, importWords } = flow;
  if (!draft || !resolution || !importWords) return <Redirect href="/import" />;
  const scheme = draft.wallet.derivationScheme;
  return (
    <ResultScreen
      activity={resolution[scheme]}
      fundingAddress={draft.wallet.funding.address}
      onContinue={() => router.push("/set-password")}
      onOtherSet={importSourceView(resolution).skipped ? undefined : () => router.back()}
      lookFurther={(activity) => lookFurther(importWords.join(" "), scheme, activity)}
      onFoundMore={flow.lookedFurther}
      online={online}
    />
  );
}
