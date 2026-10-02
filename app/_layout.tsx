import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RuntimeGate } from "@/boot/RuntimeGate";
import { stackScreenOptions } from "@/navigation/stackOptions";
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
      <RuntimeGate>
        <SafeAreaProvider>
          <Routes />
        </SafeAreaProvider>
      </RuntimeGate>
    </GestureHandlerRootView>
  );
}

function Routes() {
  // A font that fails to load falls back to the system face; the app still opens.
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return <View style={styles.root} />;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="unlock" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="portfolio/[id]" options={{ title: "Portfolio" }} />
      <Stack.Screen name="markets/[symbol]" options={{ title: "Tracker" }} />
      {MODALS.map(({ name, title }) => (
        <Stack.Screen key={name} name={name} options={{ title, presentation: "modal" }} />
      ))}
      <Stack.Screen name="dev/ui" options={{ title: "UI kit" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
});
