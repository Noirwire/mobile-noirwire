import type { TrackerRowView } from "@noirwire/shared/presentation";
import { StarIcon } from "phosphor-react-native/src/icons/Star";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Chart, IconButton, Text } from "@/ui";
import { selectionHaptic } from "@/ui/haptics";
import { colors, layout, opacity, radius, size } from "@/ui/theme";
import { TrackerMark } from "@/ui/TrackerMark";
import { usePriceHistory } from "./useMarketData";

/** Sparklines give way first: below this width, and at large text sizes. */
const SPARK_MIN_WIDTH = 360;
const SPARK_MAX_FONT_SCALE = 1.3;

type RowProps = {
  row: TrackerRowView;
  onOpen: (symbol: string) => void;
  onStar: (symbol: string) => void;
};

function Star({ row, onStar }: Pick<RowProps, "row" | "onStar">) {
  if (!row.star) return null;
  return (
    <IconButton
      label={row.star.label}
      onPress={() => {
        selectionHaptic();
        onStar(row.symbol);
      }}
    >
      <StarIcon
        size={size.icon}
        weight={row.star.watched ? "fill" : "regular"}
        color={row.star.watched ? colors["ink-strong"] : colors.faint}
      />
    </IconButton>
  );
}

/** Drawn only beside a live price: without one there is no direction to tint it with. */
function Sparkline({ symbol, live }: { symbol: string; live: boolean }) {
  const history = usePriceHistory(symbol, "1D", live);
  if (!live || history.status !== "ready") return <View style={styles.spark} />;
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.spark}
    >
      <Chart points={history.points} height={28} label="" />
    </View>
  );
}

function PriceColumn({ row }: { row: TrackerRowView }) {
  return (
    <View style={styles.price}>
      <Text style={styles.figure}>{row.price}</Text>
      {row.change ? (
        <Text variant="faint" tone={row.change.tone} style={styles.figure}>
          {row.change.text}
        </Text>
      ) : (
        <Text variant="faint">{row.noLivePrice}</Text>
      )}
    </View>
  );
}

/** One tracker in a list: one element for a screen reader, with its star as a separate button. */
export function TrackerRow({ row, onOpen, onStar }: RowProps) {
  const { width, fontScale } = useWindowDimensions();
  const roomy = width >= SPARK_MIN_WIDTH && fontScale <= SPARK_MAX_FONT_SCALE;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.label}
        onPress={() => onOpen(row.symbol)}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <TrackerMark symbol={row.symbol} live={row.live} />
        <View style={styles.names}>
          <Text numberOfLines={1}>{row.name}</Text>
          <Text variant="faint" numberOfLines={1}>
            {row.caption}
          </Text>
        </View>
        {roomy && <Sparkline symbol={row.symbol} live={row.live} />}
        <PriceColumn row={row} />
      </Pressable>
      <Star row={row} onStar={onStar} />
    </View>
  );
}

/** One tracker on a horizontally scrolling shelf. */
export function TrackerCard({ row, onOpen }: Omit<RowProps, "onStar">) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.label}
      onPress={() => onOpen(row.symbol)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <TrackerMark symbol={row.symbol} live={row.live} size="sm" />
      <View>
        <Text numberOfLines={1}>{row.name}</Text>
        <Text variant="faint" numberOfLines={1}>
          {row.symbol}
        </Text>
      </View>
      <View>
        <Text style={styles.figure}>{row.price}</Text>
        {row.change ? (
          <Text variant="faint" tone={row.change.tone} style={styles.figure}>
            {row.change.text}
          </Text>
        ) : (
          <Text variant="faint">{row.noLivePrice}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: layout.hairline },
  main: { flex: 1, minHeight: 72, flexDirection: "row", alignItems: "center", gap: layout.inset },
  pressed: { opacity: opacity.pressed },
  names: { flex: 1, minWidth: 0 },
  spark: { width: 56, height: 28 },
  price: { alignItems: "flex-end", flexShrink: 0 },
  figure: { fontVariant: ["tabular-nums"] },
  card: {
    width: 152,
    gap: layout.tight,
    padding: layout.inset,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors["line-subtle"],
    backgroundColor: colors.surface,
  },
});
