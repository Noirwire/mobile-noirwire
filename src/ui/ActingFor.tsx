import { StyleSheet, View } from "react-native";
import { IdentityMark } from "./IdentityMark";
import type { IdentityGlyph, IdentityTint } from "./identityGlyphs";
import { Text } from "./Text";
import { colors, layout, radius } from "./theme";

type ActingForProps = {
  name: string;
  glyph?: IdentityGlyph;
  tint?: IdentityTint;
};

/** The neutral tint draws the line in ink at 40 percent (spec 3.9). */
const NEUTRAL_LINE_OPACITY = 0.4;
const LINE_HEIGHT = 3;

/**
 * Which portfolio a sheet acts for (spec 3.9): the 3pt identity line in the
 * portfolio's tint, then its mark and its name. The line is decoration; the
 * name carries the same information for everyone.
 */
export function ActingFor({ name, glyph, tint = "neutral" }: ActingForProps) {
  return (
    <View style={styles.block}>
      <View
        aria-hidden
        style={[
          styles.line,
          { backgroundColor: colors[`portfolio-${tint}`] },
          tint === "neutral" && { opacity: NEUTRAL_LINE_OPACITY },
        ]}
      />
      <View style={styles.row}>
        <IdentityMark glyph={glyph} tint={tint} size="sm" />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: layout.inset },
  line: { height: LINE_HEIGHT, borderRadius: radius.pill },
  row: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  name: { flex: 1 },
});
