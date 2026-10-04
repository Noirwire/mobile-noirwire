import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/ui";
import { layout, opacity } from "@/ui/theme";

type TextToggleProps = {
  label: string;
  expanded: boolean;
  onPress: () => void;
};

/**
 * A text-only control at caption size that opens or closes an explanation
 * under it. Its touch target meets the minimum comfortably on both
 * platforms through `hitSlop`, not through reserved layout height: a
 * `minHeight` tall enough for that target would centre one line of caption
 * text inside a box visually much taller than the text itself, breaking the
 * screen's 8pt rhythm wherever two such controls sit near other short rows.
 */
export function TextToggle({ label, expanded, onPress }: TextToggleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded }}
      hitSlop={{ top: 14, bottom: 14, left: layout.tight, right: layout.tight }}
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
  target: { alignSelf: "flex-start" },
  pressed: { opacity: opacity.pressed },
  label: { textDecorationLine: "underline" },
});
