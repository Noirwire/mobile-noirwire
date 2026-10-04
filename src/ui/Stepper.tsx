import { commonCopy } from "@noirwire/shared/copy";
import { MinusIcon } from "phosphor-react-native/src/icons/Minus";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { readAsOne } from "./accessibility";
import { selectionHaptic } from "./haptics";
import { clampWhole, parseTyped, type StepperBounds } from "./stepperValue";
import { Text } from "./Text";
import { colors, fonts, layout, opacity, radius, size } from "./theme";
import { controlText, maxFontScale } from "./typography";

type StepperProps = {
  /** Names the value for a screen reader, for example "NVDAx share in percent". */
  label: string;
  /** A whole percent. */
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** How far one press, or one repeat of a held press, moves the value. */
  step?: number;
};

/** A held press waits this long, then repeats at this interval until it is let go or meets a bound. */
export const REPEAT_DELAY_MS = 400;
export const REPEAT_INTERVAL_MS = 100;

/**
 * Minus, a numeric field and plus, for a whole percent. A screen reader sees
 * one adjustable control that moves by the same step as the buttons; the
 * field takes a typed value, rounded and kept within the bounds.
 */
export function Stepper({ label, value, onChange, min = 0, max = 100, step = 5 }: StepperProps) {
  const bounds: StepperBounds = { min, max };
  const latest = useRef(value);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  latest.current = value;
  useEffect(() => stopRepeat, []);

  function stopRepeat() {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  }

  /** Moves by one step; reports whether the value could move at all. */
  function nudge(delta: number) {
    const next = clampWhole(latest.current + delta, bounds);
    if (next === latest.current) return false;
    latest.current = next;
    selectionHaptic();
    onChange(next);
    return true;
  }

  function startRepeat(delta: number) {
    stopRepeat();
    repeat.current = setInterval(() => {
      if (!nudge(delta)) stopRepeat();
    }, REPEAT_INTERVAL_MS);
  }

  function commitDraft() {
    if (draft === null) return;
    const next = parseTyped(draft, value, bounds);
    setDraft(null);
    if (next !== value) onChange(next);
  }

  return (
    <View
      {...readAsOne}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: commonCopy.percentSpoken(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        nudge(event.nativeEvent.actionName === "increment" ? step : -step)
      }
      style={styles.stepper}
    >
      <StepButton
        label={commonCopy.decreaseLabel(label)}
        disabled={value <= min}
        onPress={() => nudge(-step)}
        onLongPress={() => startRepeat(-step)}
        onPressOut={stopRepeat}
      >
        <MinusIcon size={size.iconSmall} color={colors.ink} />
      </StepButton>
      <View style={styles.field}>
        <TextInput
          accessibilityLabel={label}
          value={draft ?? String(value)}
          onFocus={() => setDraft(String(value))}
          onChangeText={setDraft}
          onBlur={commitDraft}
          onSubmitEditing={commitDraft}
          keyboardType="number-pad"
          keyboardAppearance="dark"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={3}
          maxFontSizeMultiplier={maxFontScale.body}
          selectionColor={colors.ink}
          style={styles.input}
        />
        <Text variant="note" aria-hidden>
          %
        </Text>
      </View>
      <StepButton
        label={commonCopy.increaseLabel(label)}
        disabled={value >= max}
        onPress={() => nudge(step)}
        onLongPress={() => startRepeat(step)}
        onPressOut={stopRepeat}
      >
        <PlusIcon size={size.iconSmall} color={colors.ink} />
      </StepButton>
    </View>
  );
}

type StepButtonProps = {
  label: string;
  disabled: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPressOut: () => void;
  children: ReactNode;
};

function StepButton({
  label,
  disabled,
  onPress,
  onLongPress,
  onPressOut,
  children,
}: StepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      delayLongPress={REPEAT_DELAY_MS}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.inert]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: "row", alignItems: "center", gap: layout.hairline },
  button: {
    width: size.minTarget,
    height: size.minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: size.stroke,
    borderColor: colors.line,
  },
  pressed: { backgroundColor: colors.elevated, opacity: opacity.pressed },
  inert: { opacity: opacity.inert },
  field: {
    minWidth: size.stepperField,
    height: size.minTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.tight,
    borderRadius: radius.tile,
    backgroundColor: colors.elevated,
  },
  input: {
    flexShrink: 1,
    minWidth: 0,
    padding: 0,
    textAlign: "right",
    fontSize: controlText.fontSize,
    fontFamily: fonts.medium,
    fontVariant: ["tabular-nums"],
    color: colors.ink,
  },
});
