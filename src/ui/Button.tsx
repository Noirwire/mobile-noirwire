import type { WaitingKind } from "@noirwire/shared/presentation";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { lightHaptic } from "./haptics";
import { Text } from "./Text";
import { colors, fonts, layout, opacity, radius, size, type ColorToken } from "./theme";
import { controlText } from "./typography";
import { useWaiting } from "./useWaiting";
import { StillWorking } from "./Waiting";

export type ButtonVariant = "primary" | "quiet" | "danger";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: ButtonVariant;
  /**
   * The press is being answered. The button stops taking presses at once; its
   * spinner and busy label appear only once the wait has lasted a moment, and
   * a calm line is added under it when the wait runs long.
   */
  loading?: boolean;
  /** Shown beside the spinner while loading, such as "Encrypting...". The button keeps its width. */
  loadingLabel?: string;
  /** What is being waited for, which decides when the calm line appears. */
  waitingFor?: WaitingKind;
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
  loadingLabel,
  waitingFor = "check",
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const inert = disabled || loading;
  const waiting = useWaiting(loading, waitingFor);
  const spinning = loading && waiting.signal !== "none";

  function press(event: GestureResponderEvent) {
    if (variant === "primary") {
      lightHaptic();
    }
    onPress?.(event);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spinning && loadingLabel ? loadingLabel : label}
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
          spinning ? (
            <>
              <ActivityIndicator color={colors[LABEL_TONE[variant]]} />
              {loadingLabel !== undefined && (
                <Text tone={LABEL_TONE[variant]} style={styles.label} numberOfLines={1}>
                  {loadingLabel}
                </Text>
              )}
            </>
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
      <StillWorking waiting={waiting} />
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: size.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: layout.tight,
    paddingHorizontal: layout.gutter,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: "transparent",
  },
  primary: { backgroundColor: colors["ink-strong"] },
  quiet: {},
  danger: { borderColor: colors.danger },
  pressed: { transform: [{ translateY: 1 }] },
  inert: { opacity: opacity.inert },
  label: { ...controlText, fontFamily: fonts.medium },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.ink },
  quiet: {},
  danger: { backgroundColor: colors.elevated },
});
