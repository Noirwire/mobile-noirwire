import { commonCopy } from "@noirwire/shared/copy";
import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { useState, type Ref } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { IconButton } from "./IconButton";
import { Text } from "./Text";
import { colors, fonts, layout, radius, size } from "./theme";
import { controlText, maxFontScale } from "./typography";

type FieldProps = Omit<TextInputProps, "style" | "secureTextEntry"> & {
  label: string;
  error?: string;
  /** Hides what is typed and adds a control to reveal it. */
  secure?: boolean;
  /** Whether a secure field shows what is typed, for a screen that controls it. */
  revealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** The reveal control's names; by default "Show" and "Hide" followed by the label. */
  revealLabels?: { show: string; hide: string };
  /** A field this many lines tall from the start, for text that runs over several. */
  lines?: number;
  ref?: Ref<TextInput>;
};

export function Field({
  label,
  error,
  secure = false,
  revealed: controlledRevealed,
  onRevealedChange,
  revealLabels = { show: commonCopy.showLabel(label), hide: commonCopy.hideLabel(label) },
  lines,
  ref,
  ...input
}: FieldProps) {
  const [ownRevealed, setOwnRevealed] = useState(false);
  const revealed = controlledRevealed ?? ownRevealed;
  const setRevealed = (next: boolean) => {
    setOwnRevealed(next);
    onRevealedChange?.(next);
  };
  const VisibilityIcon = revealed ? EyeSlashIcon : EyeIcon;

  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View style={[styles.box, error !== undefined && styles.boxInvalid]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          aria-invalid={error !== undefined}
          placeholderTextColor={colors.faint}
          selectionColor={colors.ink}
          keyboardAppearance="dark"
          maxFontSizeMultiplier={maxFontScale.body}
          autoCapitalize={secure ? "none" : input.autoCapitalize}
          autoCorrect={secure ? false : input.autoCorrect}
          {...input}
          secureTextEntry={secure && !revealed}
          multiline={lines !== undefined ? true : input.multiline}
          style={[styles.input, lines !== undefined && tall(lines)]}
        />
        {secure && (
          <IconButton
            label={revealed ? revealLabels.hide : revealLabels.show}
            onPress={() => setRevealed(!revealed)}
          >
            <VisibilityIcon size={size.icon} color={colors.dim} />
          </IconButton>
        )}
      </View>
      {error !== undefined && (
        <Text variant="faint" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

/** Room for `lines` lines of typed text, which starts at the top. */
const tall = (lines: number) =>
  ({
    minHeight: lines * LINE_HEIGHT + 2 * layout.inset,
    paddingVertical: layout.inset,
    lineHeight: LINE_HEIGHT,
    textAlignVertical: "top",
  }) as const;

const LINE_HEIGHT = 22;

const styles = StyleSheet.create({
  field: { gap: layout.tight },
  box: {
    minHeight: size.control,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
  },
  boxInvalid: { borderColor: colors.danger },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: size.control,
    paddingHorizontal: layout.group,
    fontSize: controlText.fontSize,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
});
