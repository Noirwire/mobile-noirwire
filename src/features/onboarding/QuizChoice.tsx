import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/ui";
import { colors, layout, opacity, radius, size } from "@/ui/theme";

type QuizChoiceProps = { word: string; disabled: boolean; onPress: () => void };

/** One of the quiz's four answers: half a row wide and 52pt tall, named by its word. */
export function QuizChoice({ word, disabled, onPress }: QuizChoiceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={word}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed, disabled && styles.inert]}
    >
      <Text selectable={false}>{word}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: size.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.group,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: { borderColor: colors["line-strong"] },
  inert: { opacity: opacity.inert },
});
