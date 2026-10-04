import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, fonts, radius } from "./theme";

type TrackerMarkProps = {
  /** The tracker's ticker; its leading letters are drawn, without the issuer's trailing "x". */
  symbol: string;
  /** A small dot that says the price beside it is live. */
  live?: boolean;
  size?: keyof typeof TILE;
};

const TILE = { sm: 32, md: 40, lg: 48 } as const;
const FONT = { sm: 10, md: 11, lg: 13 } as const;
/** As many letters as the tile holds whole, so a mark never ends in a truncation. */
const LETTERS = { sm: 3, md: 3, lg: 4 } as const;
const DOT = 8;

/**
 * A tracker's mark: its ticker's letters on a neutral tile, so a tracker never
 * borrows a portfolio's glyph or tint. Decoration only: the name beside it is
 * what gets read out, so the letters keep the tile's size at every text size
 * instead of growing out of it.
 */
export function TrackerMark({ symbol, live = false, size = "md" }: TrackerMarkProps) {
  const letters = symbol.replace(/x$/, "").slice(0, LETTERS[size]).toUpperCase();
  return (
    <View aria-hidden style={[styles.tile, { width: TILE[size], height: TILE[size] }]}>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.letters, { fontSize: FONT[size], lineHeight: FONT[size] + 4 }]}
      >
        {letters}
      </Text>
      {live && <View style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    paddingHorizontal: 2,
    borderRadius: radius.mark,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors["surface-strong"],
  },
  letters: { fontFamily: fonts.semibold, color: colors.ink, letterSpacing: -0.2 },
  dot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.base,
    backgroundColor: colors.safe,
  },
});
