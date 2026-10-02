import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, MIN_TARGET, radius } from "./theme";

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
            onPress={() => onChange(option)}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text tone={selected ? "base" : "dim"} style={styles.option} numberOfLines={1}>
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
    borderWidth: 1,
    borderColor: colors.line,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TARGET,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.tile,
  },
  selected: { backgroundColor: colors["ink-strong"] },
  option: { fontSize: 14 },
});
