import { Pressable, StyleSheet, View } from "react-native";
import { selectionHaptic } from "./haptics";
import { Text } from "./Text";
import { colors, opacity, radius, size } from "./theme";

type SegmentedProps<Option extends string> = {
  /** Names the choice being made, for a screen reader. */
  label: string;
  options: readonly Option[];
  value: Option;
  onChange: (option: Option) => void;
};

/** One choice from a short fixed set, such as a chart range or the token to pay with. */
export function Segmented<Option extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<Option>) {
  function choose(option: Option) {
    if (option === value) return;
    selectionHaptic();
    onChange(option);
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={option}
            accessibilityState={{ checked: selected }}
            onPress={() => choose(option)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text variant="note" tone={selected ? "base" : "dim"} numberOfLines={1}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radius.tile,
    borderWidth: size.stroke,
    borderColor: colors.line,
  },
  segment: {
    flex: 1,
    minHeight: size.minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.tile,
  },
  selected: { backgroundColor: colors["ink-strong"] },
  pressed: { opacity: opacity.pressed },
});
