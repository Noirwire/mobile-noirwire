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
    <>
      <WelcomeScreen
        onAction={(kind) => {
          switch (kind) {
            case "create":
              flow.startCreate();
              return router.push("/create");
            case "restore":
              return router.push("/import");
            case "explore":
              return router.push("/look-around");
          }
        }}
      />
      <DevCorner onOpenKit={() => router.push("/dev/ui")} />
    </>
  );
}

function DevCorner({ onOpenKit }: { onOpenKit: () => void }) {
  if (__DEV__) {
    // Required inside the development branch so a production bundle, where
    // __DEV__ is the constant false, drops the link and its words altogether.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DevKitLink } = require("@/dev/DevKitLink") as typeof import("@/dev/DevKitLink");
    return <DevKitLink onPress={onOpenKit} />;
  }
  return null;
}
