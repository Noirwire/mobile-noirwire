import { Redirect, useRouter } from "expo-router";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { SourceScreen } from "@/features/onboarding/SourceScreen";

export default function ImportSource() {
  const router = useRouter();
  const flow = useOnboardingFlow();
  if (!flow.resolution) return <Redirect href="/import" />;
  return (
    <SourceScreen
      resolution={flow.resolution}
      initialChoice={flow.choice}
      onOpen={(choice) => {
        flow.choose(choice);
        router.push("/import-result");
      }}
    />
  );
}
