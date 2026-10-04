import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/ui";
import { layout, size } from "@/ui/theme";

export const DEV_KIT_LABEL = "Open the UI kit";

/**
 * A development build's way into the UI kit: a small link in the top corner,
 * out of the screen's own column. Draws nothing in any other build.
 */
export function DevKitLink({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  if (!__DEV__) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={DEV_KIT_LABEL}
      onPress={onPress}
      style={[styles.corner, { top: insets.top }]}
    >
      <Text variant="faint">UI kit</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: "absolute",
    right: layout.gutter,
    minHeight: size.minTarget,
    minWidth: size.minTarget,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
