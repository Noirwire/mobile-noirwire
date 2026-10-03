import { PRICE_RANGES, type PriceRange } from "@noirwire/shared/domain";
import { StarIcon } from "phosphor-react-native/src/icons/Star";
import { useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Chart,
  Divider,
  EmptyState,
  IconButton,
  ListRow,
  Notice,
  Segmented,
  Skeleton,
  Text,
} from "@/ui";
import { selectionHaptic } from "@/ui/haptics";
import { colors, fonts, layout, size } from "@/ui/theme";
import { TrackerMark } from "@/ui/TrackerMark";
import { useServices } from "../services";
import { mobileSettingsCopy } from "../settings/copy";
import { trackerView, type TrackerAction } from "./trackerView";
import { useLivePrices, usePriceHistory, useWalletSnapshot } from "./useMarketData";
import { toggleWatch } from "./watchlist";

export type TrackerIntent =
  | { kind: "buy" | "sell" }
  | { kind: "createWallet" }
  | { kind: "createPortfolio" }
  | { kind: "portfolio"; id: string }
  | { kind: "risks" }
  | { kind: "issuer" }
  | { kind: "markets" };

type TrackerScreenProps = {
  symbol: string;
  /** A visitor without a wallet sees no holding and no trade buttons. */
  visitor?: boolean;
  onIntent: (intent: TrackerIntent) => void;
};

const CHART_HEIGHT = 220;
/** At large text sizes, Buy and Sell stack. */
const STACK_FONT_SCALE = 1.3;

/** Spec 2.19, and 2.2 in visitor mode: one tracker's price, and what is held of it. */
export function TrackerScreen({ symbol, visitor = false, onIntent }: TrackerScreenProps) {
  const { useOnline } = useServices();
  const online = useOnline();
  const wallet = useWalletSnapshot();
  const updatedAt = useLivePrices();
  const [range, setRange] = useState<PriceRange>("1D");
  const [risksOpen, setRisksOpen] = useState(false);
  const history = usePriceHistory(symbol, range);
  const { fontScale } = useWindowDimensions();
  const view = trackerView({
    symbol,
    wallet: visitor ? null : wallet,
    updatedAt,
    online,
    range,
    history,
  });

  if (view.kind === "notFound") {
    return (
      <SafeAreaView style={styles.safe} edges={["right", "bottom", "left"]}>
        <EmptyState
          title={view.title}
          detail={view.detail}
          action={
            <Button
              variant="quiet"
              label={view.back}
              onPress={() => onIntent({ kind: "markets" })}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const bar = (
    <View style={[styles.bar, fontScale > STACK_FONT_SCALE && styles.barStacked]}>
      {view.offline && <Text variant="faint">{view.offline}</Text>}
      {view.bottomNote && <Text variant="faint">{view.bottomNote}</Text>}
      <View style={[styles.actions, fontScale > STACK_FONT_SCALE && styles.barStacked]}>
        {view.actions.map((action) => (
          <ActionButton key={action.kind} action={action} onIntent={onIntent} />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["right", "left"]}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <TrackerMark symbol={symbol} size="lg" />
          <View style={styles.names}>
            <Text style={styles.name}>{view.name}</Text>
            <Text variant="faint">{view.caption}</Text>
          </View>
          {view.star && (
            <IconButton
              label={view.star.label}
              onPress={() => {
                selectionHaptic();
                toggleWatch(symbol);
              }}
            >
              <StarIcon
                size={size.icon}
                weight={view.star.watched ? "fill" : "regular"}
                color={view.star.watched ? colors["ink-strong"] : colors.faint}
              />
            </IconButton>
          )}
        </View>

        <View style={styles.hero}>
          {updatedAt === null && view.price.live === false && history.status === "loading" ? (
            <Skeleton width={180} height={42} />
          ) : view.price.live ? (
            <View style={styles.priceLine}>
              <Text variant="display" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6}>
                {view.price.figure}
              </Text>
              <Text variant="faint">{view.price.tag}</Text>
            </View>
          ) : (
            <View>
              <Text>{view.price.figure}</Text>
              <Text variant="faint">{view.price.note}</Text>
            </View>
          )}
          {view.change && (
            <View style={styles.priceLine}>
              <Text tone={view.change.tone} style={styles.tabular}>
                {view.change.text}
              </Text>
              <Text variant="faint">{view.change.caption}</Text>
            </View>
          )}
          <Text variant="faint">{view.orderNote}</Text>
        </View>

        <View style={styles.chart}>
          {view.chart.kind === "ready" ? (
            <>
              <Chart points={view.chart.points} height={CHART_HEIGHT} label={view.chart.label} />
              <Text variant="faint">{view.chart.source}</Text>
            </>
          ) : (
            <View style={styles.chartEmpty}>
              <Text variant="faint">{view.chart.text}</Text>
            </View>
          )}
          <Segmented
            label={view.ranges.label}
            options={PRICE_RANGES}
            value={view.ranges.value}
            onChange={setRange}
          />
        </View>

        {view.holding && (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>
              {view.holding.title}
            </Text>
            {view.holding.quantity && <Text style={styles.heading}>{view.holding.quantity}</Text>}
            {view.holding.value && <Text variant="faint">{view.holding.value}</Text>}
            {view.holding.rows.map((row) => (
              <ListRow
                key={row.id}
                label={row.label}
                onPress={() => onIntent({ kind: "portfolio", id: row.id })}
              />
            ))}
            {view.holding.none && <Text variant="faint">{view.holding.none}</Text>}
          </View>
        )}

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>
            {view.about.title}
          </Text>
          {view.about.retired && <Notice tone="warning">{view.about.retired}</Notice>}
          {view.about.lines.map((line) => (
            <Text key={line} tone="dim">
              {line}
            </Text>
          ))}
          <Text variant="faint">{view.about.notOffered}</Text>
          <Divider />
          <View style={styles.links}>
            <Button
              variant="quiet"
              label={view.about.readRisks}
              onPress={() => (visitor ? setRisksOpen(!risksOpen) : onIntent({ kind: "risks" }))}
            />
            {visitor && risksOpen && <RisksText />}
            <Button
              variant="quiet"
              label={view.about.issuerDetails}
              onPress={() => onIntent({ kind: "issuer" })}
            />
          </View>
        </View>
      </ScrollView>
      <SafeAreaView edges={["bottom"]}>{bar}</SafeAreaView>
    </SafeAreaView>
  );
}

/** A visitor has no Settings, so the Risks screen's text opens in place. */
function RisksText() {
  return mobileSettingsCopy.risks.sections.map((section) => (
    <View key={section.title} style={styles.risk}>
      <Text accessibilityRole="header" style={styles.heading}>
        {section.title}
      </Text>
      <Text tone="dim">{section.body}</Text>
    </View>
  ));
}

function ActionButton({
  action,
  onIntent,
}: {
  action: TrackerAction;
  onIntent: (intent: TrackerIntent) => void;
}) {
  const disabled = "disabled" in action && action.disabled;
  return (
    <Button
      label={action.label}
      variant={action.kind === "sell" ? "quiet" : "primary"}
      disabled={disabled}
      onPress={() => onIntent({ kind: action.kind })}
      style={styles.action}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  fill: { flex: 1 },
  content: { padding: layout.gutter, gap: layout.section },
  identity: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  names: { flex: 1 },
  name: { fontFamily: fonts.medium },
  hero: { gap: layout.tight },
  priceLine: { flexDirection: "row", alignItems: "baseline", gap: layout.tight, flexWrap: "wrap" },
  tabular: { fontVariant: ["tabular-nums"] },
  chart: { gap: layout.inset },
  chartEmpty: { height: CHART_HEIGHT, justifyContent: "center", alignItems: "center" },
  section: { gap: layout.inset },
  heading: { fontFamily: fonts.medium },
  links: { alignItems: "flex-start", gap: layout.tight },
  risk: { gap: layout.hairline },
  bar: {
    gap: layout.tight,
    paddingHorizontal: layout.gutter,
    paddingVertical: layout.tight,
    borderTopWidth: 1,
    borderTopColor: colors["line-subtle"],
    backgroundColor: colors.base,
  },
  barStacked: { flexDirection: "column" },
  actions: { flexDirection: "row", gap: layout.inset },
  action: { flex: 1, minHeight: 56 },
});
