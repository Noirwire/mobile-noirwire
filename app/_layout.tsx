import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RuntimeGate } from "@/boot/RuntimeGate";
import { MoneyProvider } from "@/features/network/money";
import { NetworkGate } from "@/features/network/NetworkGate";
import { OfflineBanner } from "@/features/network/OfflineBanner";
import { deviceServices, ServicesProvider } from "@/features/services";
import { SHEET_ROUTES, type SheetRouteName } from "@/navigation/gateRules";
import { stackScreenOptions } from "@/navigation/stackOptions";
import { WalletGate } from "@/navigation/WalletGate";
import { ActivityCapture } from "@/platform/ActivityCapture";
import { installedPlatform, installMobilePlatform, noteScreen } from "@/platform/install";
import { PrivacyCover } from "@/platform/PrivacyCover";
import { colors } from "@/ui/theme";
import { fontAssets } from "@/ui/typography";

const SHEET_TITLES: Record<SheetRouteName, string> = {
  trade: "Trade",
  send: "Send",
  receive: "Receive",
  fund: "Fund",
  "new-portfolio": "New portfolio",
  "pie-builder": "Build a pie",
  "pie-order": "Pie order",
};

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
      <MoneyProvider money={installed.money}>
        <ActivityCapture onInput={installed.activity.noteInput}>
          <NetworkGate>
            <OfflineBanner pinned />
            {/* The screens measure their safe area from where they begin, which is under the banner while it shows. */}
            <SafeAreaProvider style={styles.root}>
              <WalletGate>
                <Stack screenOptions={stackScreenOptions}>
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  <Stack.Screen name="(visitor)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="unlock"
                    options={{ headerShown: false, gestureEnabled: false }}
                  />
                  <Stack.Screen name="reset" options={{ title: "", gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  {SHEET_ROUTES.map((name) => (
                    <Stack.Screen
                      key={name}
                      name={name}
                      options={{ title: SHEET_TITLES[name], presentation: "modal" }}
                    />
                  ))}
                  <Stack.Screen name="dev/ui" options={{ title: "UI kit" }} />
                </Stack>
              </WalletGate>
            </SafeAreaProvider>
          </NetworkGate>
          <PrivacyCover />
        </ActivityCapture>
      </MoneyProvider>
    </ServicesProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
});
