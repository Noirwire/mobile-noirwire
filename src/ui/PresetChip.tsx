import { Pressable, StyleSheet } from "react-native";
import { selectionHaptic } from "./haptics";
import { Text } from "./Text";
import { colors, layout, opacity, radius, size } from "./theme";

type PresetChipProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** What a screen reader hears, when the label alone is only a number. */
  accessibilityLabel?: string;
};

/**
 * An inline, unfilled chip that fills a preset amount, such as "10". It can
 * be disabled, which the selection Chip cannot: a preset the balance cannot
 * cover is shown but not offered (spec 2.16).
 */
export function PresetChip({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
}: PresetChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && styles.inert]}
    >
      <Text variant="faint" tone="dim" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: size.minTarget,
    justifyContent: "center",
    paddingHorizontal: layout.group,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { borderColor: colors["line-strong"] },
  inert: { opacity: opacity.inert },
});
