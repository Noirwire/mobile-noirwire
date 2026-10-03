import { Pressable, StyleSheet, View } from "react-native";
import { selectionHaptic } from "./haptics";
import { IdentityMark } from "./IdentityMark";
import type { IdentityGlyph, IdentityTint } from "./identityGlyphs";
import { Text } from "./Text";
import { colors, layout, opacity, radius, size } from "./theme";

type PortfolioChoiceProps = {
  name: string;
  /** What it holds that matters to this choice, such as "312.40 USDC cash". */
  detail: string;
  glyph?: IdentityGlyph;
  tint?: IdentityTint;
  selected: boolean;
  onSelect: () => void;
};

/**
 * One portfolio of a single choice inside a sheet: its mark, its name and
 * one trailing figure, read as one radio button.
 */
export function PortfolioChoice({
  name,
  detail,
  glyph,
  tint,
  selected,
  onSelect,
}: PortfolioChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${name}, ${detail}`}
      accessibilityState={{ selected, checked: selected }}
      onPress={() => {
        selectionHaptic();
        onSelect();
      }}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
    >
      <IdentityMark glyph={glyph} tint={tint} size="md" />
      <View style={styles.copy}>
        <Text numberOfLines={1}>{name}</Text>
      </View>
      <Text tone="dim" style={styles.detail}>
        {detail}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.minTarget + layout.group,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
    padding: layout.inset,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors["line-subtle"],
  },
  selected: { borderColor: colors["line-strong"], backgroundColor: colors["surface-raised"] },
  pressed: { opacity: opacity.pressed },
  copy: { flex: 1 },
  detail: { fontVariant: ["tabular-nums"] },
});
