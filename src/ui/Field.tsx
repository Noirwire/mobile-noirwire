import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { useState } from "react";
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
};

export function Field({ label, error, secure = false, ...input }: FieldProps) {
  const [revealed, setRevealed] = useState(false);
  const VisibilityIcon = revealed ? EyeSlashIcon : EyeIcon;

  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View style={[styles.box, error !== undefined && styles.boxInvalid]}>
        <TextInput
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
          style={styles.input}
        />
        {secure && (
          <IconButton
            label={revealed ? `Hide ${label}` : `Show ${label}`}
            onPress={() => setRevealed((shown) => !shown)}
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
