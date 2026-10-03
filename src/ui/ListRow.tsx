import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, layout, opacity, size } from "./theme";

type ListRowProps = {
  label: string;
  /** One line under the label; also read out as the row's hint. */
  caption?: string;
  /** A short value at the trailing edge, such as a version. */
  value?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  /** A destructive destination, such as Reset wallet. */
  danger?: boolean;
  /** Whether a chevron says the row leads to another screen; by default, when it can be pressed. */
  chevron?: boolean;
};

/**
 * One line of a settings list: a label, an optional caption and value, and a
 * chevron when it leads somewhere. The whole row is one control and one
 * screen-reader element.
 */
export function ListRow({
  label,
  caption,
  value,
  onPress,
  onLongPress,
  danger = false,
  chevron = onPress !== undefined,
}: ListRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={caption}
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <Text tone={danger ? "danger" : "ink"}>{label}</Text>
        {caption !== undefined && <Text variant="note">{caption}</Text>}
      </View>
      {value !== undefined && <Text tone="dim">{value}</Text>}
      {chevron && <CaretRightIcon size={size.iconSmall} color={colors.faint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.group,
    paddingVertical: layout.tight,
  },
  pressed: { opacity: opacity.pressed },
  copy: { flex: 1, gap: layout.hairline },
});
