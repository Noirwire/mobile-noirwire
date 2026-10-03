import { Stack } from "expo-router";
import { settingsCopy } from "@noirwire/shared/copy";
import { mobileSettingsCopy } from "@/features/settings/copy";
import { stackScreenOptions } from "@/navigation/stackOptions";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="recovery-phrase" options={{ title: settingsCopy.recovery.title }} />
      <Stack.Screen name="password" options={{ title: settingsCopy.password.title }} />
      <Stack.Screen name="privacy" options={{ title: mobileSettingsCopy.privacy.title }} />
      <Stack.Screen name="risks" options={{ title: mobileSettingsCopy.risks.title }} />
      <Stack.Screen name="about" options={{ title: mobileSettingsCopy.about.title }} />
      <Stack.Screen name="reset" options={{ title: settingsCopy.reset.title }} />
    </Stack>
  );
}
