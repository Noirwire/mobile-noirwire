import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/ui";
import { opacity, size } from "@/ui/theme";

type TextToggleProps = {
  label: string;
  expanded: boolean;
  onPress: () => void;
};

/** A text-only control at caption size that opens or closes an explanation under it. */
export function TextToggle({ label, expanded, onPress }: TextToggleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      <Text variant="note" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: size.minTarget, justifyContent: "center", alignSelf: "flex-start" },
  pressed: { opacity: opacity.pressed },
  label: { textDecorationLine: "underline" },
});
