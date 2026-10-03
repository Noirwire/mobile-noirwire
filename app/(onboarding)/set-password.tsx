import { useRouter } from "expo-router";
import { getPlatform } from "@noirwire/shared/platform";
import { useEffect } from "react";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { SetPasswordScreen } from "@/features/onboarding/SetPasswordScreen";
import { useServices } from "@/features/services";

export default function SetPassword() {
  const router = useRouter();
  const flow = useOnboardingFlow();
  const { biometric } = useServices();
  useEffect(() => getPlatform().track("onboarding_step", { step: "password" }), []);

  if (!flow.draft || !flow.origin) return null;
  return (
    <SetPasswordScreen
      draft={flow.draft}
      origin={flow.origin}
      onSaved={async (password) => {
        const offer = (await biometric.method()) !== null;
        flow.saved(password);
        router.replace(offer ? "/biometric" : "/");
      }}
    />
  );
}
