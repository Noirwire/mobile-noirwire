import { useEffect, useState } from "react";
import { AppState, StyleSheet, View, type AppStateStatus } from "react-native";
import { Mark } from "@/ui";
import { colors } from "@/ui/theme";

/**
 * Covers the whole app with the base colour and the Mark whenever it is not
 * active, which on iOS happens before the system takes the app switcher's
 * snapshot. On Android the capture-protected screens are also blank in the
 * switcher through the secure window flag.
 */
export function PrivacyCover() {
  const [state, setState] = useState<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", setState);
    return () => subscription.remove();
  }, []);

  if (state === "active" || state === undefined || state === null) return null;
  return (
    <View
      style={styles.cover}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Mark size={40} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.base,
  },
});
