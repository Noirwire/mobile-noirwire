import { useRouter } from "expo-router";
import { AboutScreen } from "@/features/settings/AboutScreen";
import { appVersion, buildNumber } from "@/features/settings/buildInfo";

export default function About() {
  const router = useRouter();
  return (
    <AboutScreen
      version={appVersion()}
      build={buildNumber()}
      onOpenRisks={() => router.push("/settings/risks")}
    />
  );
}
