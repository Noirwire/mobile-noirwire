import { Text as NativeText, type TextProps as NativeTextProps } from "react-native";
import { colors, type ColorToken } from "./theme";
import { maxFontScale, textStyles, type TextVariant } from "./typography";

export type TextProps = NativeTextProps & {
  variant?: TextVariant;
  tone?: ColorToken;
};

export function Text({ variant = "body", tone, style, ...rest }: TextProps) {
  const heading = variant === "h1" || variant === "h2";
  return (
    <NativeText
      accessibilityRole={heading ? "header" : undefined}
      maxFontSizeMultiplier={maxFontScale[variant]}
      {...rest}
      style={[textStyles[variant], tone && { color: colors[tone] }, style]}
    />
  );
}
