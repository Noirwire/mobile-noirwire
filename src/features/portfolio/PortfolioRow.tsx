import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IdentityMark, Text } from "@/ui";
import { layout, opacity } from "@/ui/theme";
import type { PortfolioRowView } from "./portfolioSummary";

type PortfolioRowProps = {
  row: PortfolioRowView;
  onPress: () => void;
  /** Archived portfolios are listed dimmed. */
  dimmed?: boolean;
  /** A control beside the row in place of its figures, such as Restore. */
  trailing?: ReactNode;
};

/** One portfolio in a list: one element to a screen reader, reading name, line, value and change. */
export function PortfolioRow({ row, onPress, dimmed = false, trailing }: PortfolioRowProps) {
  return (
    <View style={[styles.row, dimmed && styles.dimmed]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.spoken}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <IdentityMark glyph={row.icon.glyph} tint={row.icon.tint} size="lg" />
        <View style={styles.copy}>
          <Text numberOfLines={1}>{row.name}</Text>
          <Text variant="faint" numberOfLines={2}>
            {row.line}
          </Text>
        </View>
        {trailing === undefined && (
          <View style={styles.figures}>
            <Text style={styles.figure}>{row.value}</Text>
            {row.change && (
              <Text variant="faint" tone={row.change.tone} style={styles.figure}>
                {row.change.text}
              </Text>
            )}
          </View>
        )}
      </Pressable>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: layout.tight },
  body: {
    flex: 1,
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
    paddingVertical: layout.tight,
  },
  dimmed: { opacity: 0.6 },
  pressed: { opacity: opacity.pressed },
  copy: { flex: 1, minWidth: 0, gap: layout.hairline },
  figures: { alignItems: "flex-end", gap: layout.hairline, flexShrink: 0 },
  figure: { fontVariant: ["tabular-nums"], textAlign: "right" },
});
