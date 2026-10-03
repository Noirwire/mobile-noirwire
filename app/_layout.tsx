import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RuntimeGate } from "@/boot/RuntimeGate";
import { deviceServices, ServicesProvider } from "@/features/services";
import { stackScreenOptions } from "@/navigation/stackOptions";
import { WalletGate } from "@/navigation/WalletGate";
import { ActivityCapture } from "@/platform/ActivityCapture";
import { installedPlatform, installMobilePlatform, noteScreen } from "@/platform/install";
import { PrivacyCover } from "@/platform/PrivacyCover";
import { colors } from "@/ui/theme";
import { fontAssets } from "@/ui/typography";

const MODALS = [
  { name: "trade", title: "Trade" },
  { name: "send", title: "Send" },
  { name: "receive", title: "Receive" },
  { name: "fund", title: "Fund" },
  { name: "new-portfolio", title: "New portfolio" },
  { name: "pie-builder", title: "Build a pie" },
  { name: "pie-order", title: "Pie order" },
] as const;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <RuntimeGate prepare={installMobilePlatform}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <Routes />
          </KeyboardProvider>
        </SafeAreaProvider>
      </RuntimeGate>
    </GestureHandlerRootView>
  );
}

function Routes() {
  // A font that fails to load falls back to the system face; the app still opens.
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const installed = installedPlatform();
  const services = useMemo(() => deviceServices(installed), [installed]);
  const pathname = usePathname();
  useEffect(() => noteScreen(pathname), [pathname]);

  if (!fontsLoaded && !fontError) return <View style={styles.root} />;

  return (
    <ServicesProvider services={services}>
      <ActivityCapture onInput={installed.activity.noteInput}>
        <WalletGate>
          <Stack screenOptions={stackScreenOptions}>
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(visitor)" options={{ headerShown: false }} />
            <Stack.Screen name="unlock" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="reset" options={{ title: "", gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="portfolio/[id]" options={{ title: "Portfolio" }} />
            <Stack.Screen name="markets/[symbol]" options={{ title: "Tracker" }} />
            {MODALS.map(({ name, title }) => (
              <Stack.Screen key={name} name={name} options={{ title, presentation: "modal" }} />
            ))}
            <Stack.Screen name="dev/ui" options={{ title: "UI kit" }} />
          </Stack>
        </WalletGate>
        <PrivacyCover />
      </ActivityCapture>
    </ServicesProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
});
