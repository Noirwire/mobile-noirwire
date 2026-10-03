import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import type { BiometricMethod } from "@/platform/biometricKeystore";
import { BiometricOfferScreen } from "@/features/onboarding/BiometricOfferScreen";
import { useOnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { useServices } from "@/features/services";

export default function BiometricOffer() {
  const router = useRouter();
  const { savedPassword } = useOnboardingFlow();
  const { biometric } = useServices();
  const [method, setMethod] = useState<BiometricMethod | null | undefined>(undefined);

  useEffect(() => {
    void biometric.method().then(setMethod);
  }, [biometric]);

  if (!savedPassword || method === null) return <Redirect href="/" />;
  if (method === undefined) return null;
  return (
    <BiometricOfferScreen
      method={method.name}
      password={savedPassword}
      onDone={() => router.replace("/")}
    />
  );
}
