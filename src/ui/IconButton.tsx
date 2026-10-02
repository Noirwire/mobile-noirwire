import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { colors, MIN_TARGET, radius } from "./theme";

type IconButtonProps = {
  label: string;
  onPress: () => void;
  children: ReactNode;
};

/** A square 44pt target around a single icon, named for a screen reader by its label. */
export function IconButton({ label, onPress, children }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: MIN_TARGET,
    height: MIN_TARGET,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.tile,
  },
  pressed: { backgroundColor: colors.elevated },
});
