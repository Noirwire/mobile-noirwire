import { Pressable, StyleSheet, View } from "react-native";
import { selectionHaptic } from "./haptics";
import { Text } from "./Text";
import { colors, fonts, layout, radius, type ColorToken } from "./theme";

type ChoicePanelProps = {
  title: string;
  captions: { text: string; tone: ColorToken }[];
  selected: boolean;
  onSelect: () => void;
};

/**
 * One option of a single choice that needs a few lines to explain itself.
 * The whole panel is one radio button, read as its title then its captions.
 */
export function ChoicePanel({ title, captions, selected, onSelect }: ChoicePanelProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={[title, ...captions.map((caption) => caption.text)].join(". ")}
      accessibilityState={{ checked: selected }}
      onPress={() => {
        selectionHaptic();
        onSelect();
      }}
      style={[styles.panel, selected && styles.selected]}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.captions}>
        {captions.map((caption) => (
          <Text key={caption.text} variant="note" tone={caption.tone}>
            {caption.text}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: layout.hairline,
    padding: layout.group,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors["line-subtle"],
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors["ink-strong"], backgroundColor: colors["surface-raised"] },
  title: { fontFamily: fonts.medium },
  captions: { gap: layout.hairline },
});
