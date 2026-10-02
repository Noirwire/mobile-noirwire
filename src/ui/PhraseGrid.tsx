import { StyleSheet, useWindowDimensions, View } from "react-native";
import { readAsOne } from "./accessibility";
import { Button } from "./Button";
import { PhraseCopy } from "./PhraseCopy";
import { Text } from "./Text";
import { colors, layout, radius } from "./theme";
import { useCaptureProtection } from "./useCaptureProtection";

type PhraseGridProps = {
  /** Twelve or twenty-four words, in order. */
  words: readonly string[];
  revealed: boolean;
  onReveal: () => void;
  /**
   * Offers the explicit, warned Copy. Off by default: the phone's recovery
   * phrase screens offer no Copy, because a phone clipboard is readable by
   * keyboards and other apps and can sync to other devices.
   */
  copyable?: boolean;
};

const CONCEALED_WORD = "••••••";
/** Past this text size two columns no longer fit a word, so the grid becomes one column. */
const ONE_COLUMN_FONT_SCALE = 1.35;
/** Two cells and the gap between them share a row. */
const HALF_ROW = "47%";

/**
 * The recovery phrase in a numbered grid. Concealed on arrival as one unit, so
 * no word renders before Reveal; the words are never selectable, and the
 * screen is kept out of screenshots while they are shown.
 */
export function PhraseGrid({ words, revealed, onReveal, copyable = false }: PhraseGridProps) {
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > ONE_COLUMN_FONT_SCALE ? 1 : 2;
  useCaptureProtection(revealed);

  return (
    <View style={styles.phrase}>
      <View style={styles.frame}>
        <View
          {...(revealed ? {} : readAsOne)}
          accessibilityRole={revealed ? undefined : "text"}
          accessibilityLabel={revealed ? undefined : "Recovery phrase, hidden"}
          style={styles.grid}
        >
          {words.map((word, index) => (
            <View
              key={index}
              {...readAsOne}
              aria-hidden={!revealed}
              accessibilityLabel={revealed ? `Word ${index + 1}, ${word}` : undefined}
              style={[styles.cell, columns === 2 ? styles.half : styles.whole]}
            >
              <Text variant="faint" selectable={false} style={[styles.number, styles.unselectable]}>
                {String(index + 1).padStart(2, "0")}
              </Text>
              <Text selectable={false} style={[styles.word, styles.unselectable]}>
                {revealed ? word : CONCEALED_WORD}
              </Text>
            </View>
          ))}
        </View>
        {!revealed && (
          <View style={styles.cover}>
            <Button label="Reveal phrase" onPress={onReveal} />
          </View>
        )}
      </View>
      {revealed && copyable && <PhraseCopy phrase={words.join(" ")} />}
    </View>
  );
}

const styles = StyleSheet.create({
  phrase: { gap: layout.group },
  frame: { position: "relative" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
    paddingHorizontal: layout.group,
    paddingVertical: layout.inset,
    borderRadius: radius.tile,
    backgroundColor: colors.elevated,
  },
  half: { flexBasis: HALF_ROW, flexGrow: 1 },
  whole: { flexBasis: "100%" },
  number: { fontVariant: ["tabular-nums"] },
  word: { flexShrink: 1 },
  unselectable: { userSelect: "none" },
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.tile,
    backgroundColor: colors.elevated,
  },
});
