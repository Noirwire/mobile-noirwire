import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, layout, opacity, radius, size } from "./theme";

type AcknowledgeProps = {
  /** The sentence being agreed to. It is also what a screen reader announces. */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * An explicit, labelled checkbox that gates a primary action: "I have saved
 * these words", "I understand this links them". It reads as consent, which a
 * Switch does not. The whole row is the 44pt target.
 */
export function Acknowledge({ label, checked, onChange, disabled = false }: AcknowledgeProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.inert]}
    >
      <View aria-hidden style={[styles.box, checked && styles.boxChecked]}>
        {checked && <CheckIcon size={size.checkIcon} weight="bold" color={colors.base} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.minTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
  },
  pressed: { opacity: opacity.pressed },
  inert: { opacity: opacity.inert },
  box: {
    width: size.checkbox,
    height: size.checkbox,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.checkbox,
    borderWidth: size.checkboxBorder,
    borderColor: colors["line-strong"],
    backgroundColor: colors.elevated,
  },
  boxChecked: { borderColor: colors["ink-strong"], backgroundColor: colors["ink-strong"] },
  label: { flex: 1 },
});
