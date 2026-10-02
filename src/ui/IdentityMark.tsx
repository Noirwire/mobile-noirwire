import { StyleSheet, View } from "react-native";
import { IDENTITY_GLYPHS, type IdentityGlyph, type IdentityTint } from "./identityGlyphs";
import { colors, radius } from "./theme";

type IdentityMarkProps = {
  glyph?: IdentityGlyph;
  tint?: IdentityTint;
  size?: keyof typeof TILE;
};

const TILE = { sm: 32, md: 40, lg: 48 } as const;
const GLYPH = { sm: 20, md: 24, lg: 28 } as const;

/**
 * A portfolio's mark: its chosen icon in its chosen tint, on a fixed neutral
 * tile. Decoration only: the portfolio's name beside it is what gets read out.
 */
export function IdentityMark({
  glyph = "compass",
  tint = "neutral",
  size = "md",
}: IdentityMarkProps) {
  const Glyph = IDENTITY_GLYPHS[glyph];
  return (
    <View aria-hidden style={[styles.tile, { width: TILE[size], height: TILE[size] }]}>
      <Glyph size={GLYPH[size]} weight="regular" color={colors[`portfolio-${tint}`]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: radius.mark,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
  },
});
