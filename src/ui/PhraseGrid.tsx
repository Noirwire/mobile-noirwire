import { mobileOnboardingCopy, onboardingCopy } from "@noirwire/shared/copy";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { readAsOne } from "./accessibility";
import { Button } from "./Button";
import { PhraseCopy } from "./PhraseCopy";
import { ProtectionRefused } from "./ProtectionRefused";
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

const CONCEALED_WORD = onboardingCopy.phrase.hidden;
/** Past this text size two columns no longer fit a word, so the grid becomes one column. */
const ONE_COLUMN_FONT_SCALE = 1.35;
/** Two cells and the gap between them share a row. */
const HALF_ROW = "47%";

/**
 * The recovery phrase in a numbered grid. Concealed on arrival as one unit, so
 * no word renders before Reveal; the words are never selectable, and they
 * are drawn only once the screen is confirmed kept out of screenshots.
 */
export function PhraseGrid({
  words,
  revealed: asked,
  onReveal,
  copyable = false,
}: PhraseGridProps) {
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > ONE_COLUMN_FONT_SCALE ? 1 : 2;
  const protection = useCaptureProtection(asked);
  // Asked for is not shown: no word is drawn until the system has confirmed the protection.
  const revealed = asked && protection.ready;

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
              accessibilityLabel={
                revealed ? mobileOnboardingCopy.phrase.wordLabel(index + 1, word) : undefined
              }
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
            {!asked && <Button label={onboardingCopy.phrase.reveal} onPress={onReveal} />}
          </View>
        )}
      </View>
      <ProtectionRefused protection={protection} />
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
