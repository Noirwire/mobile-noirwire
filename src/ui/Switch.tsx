import { Switch as NativeSwitch, Pressable, StyleSheet, View } from "react-native";
import { selectionHaptic } from "./haptics";
import { Text } from "./Text";
import { colors, layout, opacity, size } from "./theme";

type SwitchProps = {
  label: string;
  /** One line under the label; also read out as the row's hint. */
  caption?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

const TRACK = { false: colors.line, true: colors["ink-strong"] };
/** The thumb inverts with the track, as the primary button does, so "on" never reads as white on ivory. */
const THUMB = { on: colors.base, off: colors.ink };

/**
 * A setting that is on or off, as a whole row: the label, an optional caption
 * and the platform's own switch. The row is one control, so a screen reader
 * hears the label, the state and the caption together, and a tap anywhere on
 * it flips the setting.
 */
export function Switch({ label, caption, value, onValueChange, disabled = false }: SwitchProps) {
  function flip() {
    selectionHaptic();
    onValueChange(!value);
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={caption}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={flip}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.inert]}
    >
      <View style={styles.copy}>
        <Text>{label}</Text>
        {caption !== undefined && <Text variant="note">{caption}</Text>}
      </View>
      <View aria-hidden>
        <NativeSwitch
          value={value}
          onValueChange={flip}
          disabled={disabled}
          trackColor={TRACK}
          thumbColor={value ? THUMB.on : THUMB.off}
          activeThumbColor={THUMB.on}
          ios_backgroundColor={TRACK.false}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.control,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.group,
    paddingVertical: layout.tight,
  },
  pressed: { opacity: opacity.pressed },
  inert: { opacity: opacity.inert },
  copy: { flex: 1, gap: layout.hairline },
});
