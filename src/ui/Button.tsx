import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { Text } from "./Text";
import { colors, fonts, MIN_TARGET, radius, space, type ColorToken } from "./theme";

export type ButtonVariant = "primary" | "quiet" | "danger";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: ViewStyle;
};

const LABEL_TONE: Record<ButtonVariant, ColorToken> = {
  primary: "base",
  quiet: "dim",
  danger: "danger",
};

const PRESSED_LABEL_TONE: Record<ButtonVariant, ColorToken> = {
  primary: "base",
  quiet: "ink",
  danger: "danger",
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const inert = disabled || loading;

  function press(event: GestureResponderEvent) {
    if (variant === "primary") {
      // A device with no haptic engine rejects; the press itself must still go through.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    onPress?.(event);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inert, busy: loading }}
      disabled={inert}
      onPress={press}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && pressedStyles[variant],
        pressed && styles.pressed,
        inert && styles.inert,
        style,
      ]}
    >
      {({ pressed }) =>
        loading ? (
          <ActivityIndicator color={colors[LABEL_TONE[variant]]} />
        ) : (
          <Text
            tone={pressed ? PRESSED_LABEL_TONE[variant] : LABEL_TONE[variant]}
            style={styles.label}
            numberOfLines={1}
          >
            {label}
          </Text>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TARGET,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    paddingHorizontal: space[5],
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: "transparent",
  },
  primary: { backgroundColor: colors["ink-strong"] },
  quiet: {},
  danger: { borderColor: colors.danger },
  pressed: { transform: [{ translateY: 1 }] },
  inert: { opacity: 0.4 },
  label: { fontFamily: fonts.medium },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.ink },
  quiet: {},
  danger: { backgroundColor: colors.elevated },
});
