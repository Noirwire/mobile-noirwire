import { NEVER_READ, PRICE_RANGES, type PriceRange } from "@noirwire/shared/domain";
import {
  chartHint,
  chartReadout,
  trackerView,
  type TrackerAction,
} from "@noirwire/shared/presentation";
import { screenReads } from "@noirwire/shared/wallet";
import { StarIcon } from "phosphor-react-native/src/icons/Star";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Chart,
  Divider,
  IconButton,
  ListRow,
  Notice,
  Segmented,
  Skeleton,
  Text,
  useTopLoader,
  useWaiting,
  WaitingLine,
  WaitingPlaceholder,
} from "@/ui";
import { selectionHaptic } from "@/ui/haptics";
import { RetryLine } from "@/ui/RetryLine";
import { colors, fonts, layout, size } from "@/ui/theme";
import { TrackerMark } from "@/ui/TrackerMark";
import { useBalanceFreshness } from "../network/balanceFreshness";
import { useMoney } from "../network/money";
import { useInView, useScreenClock } from "../network/useInView";
import { useBalanceRetry } from "../portfolio/useBalanceRefresh";
import { useServices } from "../services";
import { RiskSections } from "../trade/parts";
import { useLivePrices, usePriceHistory } from "./useMarketData";
import { useWalletSnapshot } from "../network/useWalletSnapshot";
import { toggleWatch } from "./watchlist";

export type TrackerIntent =
  | { kind: "buy" | "sell" }
  | { kind: "createWallet" }
  | { kind: "createPortfolio" }
  | { kind: "portfolio"; id: string }
  | { kind: "issuer" }
  | { kind: "markets" };

type TrackerScreenProps = {
  symbol: string;
  /** A visitor without a wallet sees no holding and no trade buttons. */
  visitor?: boolean;
  /** Whether the screen has the focus: its clock stands still while it does not. */
  focused?: boolean;
  onIntent: (intent: TrackerIntent) => void;
};

const CHART_HEIGHT = 220;
/** At large text sizes, Buy and Sell stack. */
const STACK_FONT_SCALE = 1.3;

/** Spec 2.19, and 2.2 in visitor mode: one tracker's price, and what is held of it. */
export function TrackerScreen({
  symbol,
  visitor = false,
  focused = true,
  onIntent,
}: TrackerScreenProps) {
  const { useOnline } = useServices();
  const online = useOnline();
  const wallet = useWalletSnapshot();
  const prices = useLivePrices();
  const now = useScreenClock(useInView(focused));
  const [range, setRange] = useState<PriceRange>("1D");
  const [risksOpen, setRisksOpen] = useState(false);
  const { history, freshness: chart } = usePriceHistory(symbol, range, true, now);
  const { fontScale } = useWindowDimensions();
  const smallestOrderUsd = useMoney().tradeChain.gaslessFromUsd;
  const balances = useBalanceFreshness();
  const retryBalances = useBalanceRetry();
  const view = trackerView(screenReads, {
    symbol,
    wallet: visitor ? null : wallet,
    updatedAt: prices.updatedAt,
    online,
    range,
    history,
    smallestOrderUsd,
    freshness: { now, prices: prices.freshness, chart, balances: visitor ? NEVER_READ : balances },
    platform: "mobile",
  });
  const loading = view.kind === "tracker" && view.loading;
  const priceWaiting = useWaiting(loading, "content");
  const chartWaiting = useWaiting(history.status === "loading", "check");
  useTopLoader(loading);
  const readout = useCallback(
    (x: number) =>
      history.status === "ready"
        ? chartReadout(history.points, x, { range, readAt: history.readAt })
        : null,
    [history, range],
  );

  if (view.kind === "notFound") {
    return (
      <SafeAreaView style={styles.safe} edges={["right", "bottom", "left"]}>
        <View style={styles.notFound}>
          <Text variant="h2" style={styles.centred}>
            {view.title}
          </Text>
          <Button variant="quiet" label={view.back} onPress={() => onIntent({ kind: "markets" })} />
        </View>
      </SafeAreaView>
    );
  }

  const bar = (
    <View style={[styles.bar, fontScale > STACK_FONT_SCALE && styles.barStacked]}>
      {view.offline && <Text variant="faint">{view.offline}</Text>}
      {view.bottomNote && <Text variant="faint">{view.bottomNote}</Text>}
      {view.minimum && <Text variant="faint">{view.minimum}</Text>}
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
            <Text accessibilityRole="header" style={styles.name}>
              {view.name}
            </Text>
            <Text variant="note">{view.caption}</Text>
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
        <Text tone="dim">{view.follows}</Text>

        <View style={styles.hero}>
          {loading && !view.price.live ? (
            <WaitingPlaceholder waiting={priceWaiting}>
              <Skeleton width={180} height={42} />
            </WaitingPlaceholder>
          ) : view.price.live ? (
            <View style={styles.priceLine}>
              <Text variant="display" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6}>
                {view.price.figure}
              </Text>
              <Text variant="faint">{view.price.tag}</Text>
            </View>
          ) : (
            <Text>{view.price.figure}</Text>
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
          {view.stale && (
            <Text variant="faint" accessibilityLiveRegion="polite">
              {view.stale}
            </Text>
          )}
        </View>

        <View style={styles.chart}>
          {view.chart.kind === "ready" ? (
            <>
              <Chart
                points={view.chart.points}
                height={CHART_HEIGHT}
                label={view.chart.label}
                readout={readout}
              />
              <View style={styles.extremes}>
                {[view.chart.high, view.chart.low].map((extreme) => (
                  <Text key={extreme.label} variant="note" style={styles.tabular}>
                    {extreme.label} {extreme.value}
                  </Text>
                ))}
                <Text variant="faint" style={styles.source}>
                  {view.chart.source}
                </Text>
              </View>
              <Text variant="faint">{chartHint("touch")}</Text>
            </>
          ) : view.chart.kind === "loading" ? (
            <View style={styles.chartEmpty}>
              <WaitingLine waiting={{ ...chartWaiting, label: view.chart.text }} />
            </View>
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
        {view.unavailable && (
          <RetryLine
            text={view.unavailable.text}
            retry={view.unavailable.retry}
            onRetry={online ? retryBalances : undefined}
          />
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
          <Divider />
          <View style={styles.links}>
            <Button
              variant="quiet"
              label={view.risks.title}
              aria-expanded={risksOpen}
              onPress={() => setRisksOpen(!risksOpen)}
            />
            {risksOpen && (
              <>
                {view.risks.lines.map((line) => (
                  <Text key={line} tone="dim">
                    {line}
                  </Text>
                ))}
                <Button
                  variant="quiet"
                  label={view.risks.details}
                  onPress={() => onIntent({ kind: "issuer" })}
                />
                <RiskSections />
              </>
            )}
          </View>
        </View>
      </ScrollView>
      <SafeAreaView edges={["bottom"]}>{bar}</SafeAreaView>
    </SafeAreaView>
  );
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
  notFound: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: layout.group,
    padding: layout.gutter,
  },
  centred: { textAlign: "center" },
  fill: { flex: 1 },
  content: { padding: layout.gutter, gap: layout.section },
  identity: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  names: { flex: 1 },
  name: { fontFamily: fonts.medium },
  hero: { gap: layout.tight },
  priceLine: { flexDirection: "row", alignItems: "baseline", gap: layout.tight, flexWrap: "wrap" },
  tabular: { fontVariant: ["tabular-nums"] },
  chart: { gap: layout.inset },
  extremes: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: layout.group },
  source: { flexGrow: 1, textAlign: "right" },
  chartEmpty: { height: CHART_HEIGHT, justifyContent: "center", alignItems: "center" },
  section: { gap: layout.inset },
  heading: { fontFamily: fonts.medium },
  links: { alignItems: "flex-start", gap: layout.tight },
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
