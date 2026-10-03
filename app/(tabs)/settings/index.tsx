import { useRouter } from "expo-router";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { appVersion } from "@/features/settings/buildInfo";

export default function Settings() {
  const router = useRouter();
  return (
    <SettingsScreen appVersion={appVersion()} onOpen={(page) => router.push(`/settings/${page}`)} />
  );
}
