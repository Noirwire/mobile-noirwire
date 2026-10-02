import { Pressable, StyleSheet } from "react-native";
import { Text } from "./Text";
import { colors, MIN_TARGET, radius, space } from "./theme";

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.active, pressed && styles.pressed]}
    >
      <Text variant="faint" tone={active ? "ink" : "dim"} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TARGET,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  active: { borderColor: colors["line-strong"], backgroundColor: colors["surface-strong"] },
  pressed: { borderColor: colors["line-strong"] },
});
