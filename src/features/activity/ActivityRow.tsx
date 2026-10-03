import type { Icon } from "phosphor-react-native";
import { ArrowDownIcon } from "phosphor-react-native/src/icons/ArrowDown";
import { ArrowUpIcon } from "phosphor-react-native/src/icons/ArrowUp";
import { TrendDownIcon } from "phosphor-react-native/src/icons/TrendDown";
import { TrendUpIcon } from "phosphor-react-native/src/icons/TrendUp";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui";
import { colors, layout, opacity, size } from "@/ui/theme";
import type { ActivityIcon, ActivityRowView } from "./activityView";

const ICONS: Record<ActivityIcon, Icon> = {
  in: ArrowDownIcon,
  out: ArrowUpIcon,
  bought: TrendUpIcon,
  sold: TrendDownIcon,
};

/** One recorded money move or trade: one element to a screen reader, pressed to open its detail. */
export function ActivityRow({ row, onPress }: { row: ActivityRowView; onPress: () => void }) {
  const Glyph = ICONS[row.icon];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View aria-hidden style={styles.circle}>
        <Glyph size={size.iconSmall} color={colors.dim} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1}>{row.title}</Text>
        <Text variant="faint" numberOfLines={1}>
          {row.caption}
        </Text>
      </View>
      <View style={styles.trailing}>
        <Text
          variant={row.value.priced ? "body" : "faint"}
          tone={row.value.tone}
          style={styles.figure}
        >
          {row.value.text}
        </Text>
        <Text variant="faint" style={styles.figure}>
          {row.amount}
        </Text>
      </View>
    </Pressable>
  );
}

const CIRCLE = 32;

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
    paddingVertical: layout.tight,
  },
  pressed: { opacity: opacity.pressed },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.elevated,
  },
  copy: { flex: 1, minWidth: 0, gap: layout.hairline },
  trailing: { alignItems: "flex-end", gap: layout.hairline, flexShrink: 0 },
  figure: { fontVariant: ["tabular-nums"], textAlign: "right" },
});
