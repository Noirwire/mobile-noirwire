import { commonCopy, mobilePortfolioCopy, portfolioCopy } from "@noirwire/shared/copy";
import {
  portfolioView,
  type ActionButton,
  type HoldingRowView,
  type MixView,
  type PortfolioAction,
  type PortfolioDetailView,
} from "@noirwire/shared/presentation";
import { screenReads } from "@noirwire/shared/wallet";
import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { DotsThreeIcon } from "phosphor-react-native/src/icons/DotsThree";
import { useCallback, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  IconButton,
  IdentityMark,
  Notice,
  Panel,
  PieRing,
  Screen,
  Skeleton,
  Text,
  useTopLoader,
  useWaiting,
  WaitingPlaceholder,
  type Waiting,
} from "@/ui";
import { FittedFigure } from "@/ui/FittedFigure";
import { RefreshScreen } from "@/ui/RefreshScreen";
import { colors, fonts, layout, opacity, radius, size } from "@/ui/theme";
import { ActivityDetailSheet } from "../activity/ActivityDetailSheet";
import { ActivityRow } from "../activity/ActivityRow";
import { usePortfolioEarn } from "../earn/useEarnScreen";
import { useServices } from "../services";
import { useMoney } from "../network/money";
import { useInView } from "../network/useInView";
import { FadeLayer } from "./FadeLayer";
import { IdentityLine } from "./IdentityLine";
import { mediumHaptic } from "./mediumHaptic";
import { setArchived } from "./portfolioActions";
import { PortfolioSettingsSheet } from "./PortfolioSettingsSheet";
import { PublicView, PublicViewExit } from "./PublicView";
import { TrackerMark } from "@/ui/TrackerMark";
import { useBalanceRefresh } from "./useBalanceRefresh";
import { useLivePrices } from "../markets/useMarketData";
import { useIsUnlocked, useWalletSnapshot } from "../network/useWalletSnapshot";

const copy = {
  detail: { ...portfolioCopy.detail, ...mobilePortfolioCopy.detail },
  publicView: { ...portfolioCopy.publicView, ...mobilePortfolioCopy.publicView },
};

type PortfolioScreenProps = {
  id: string;
  onAction: (action: PortfolioAction) => void;
  onBack: () => void;
  onOpenPortfolio: (id: string) => void;
  onSeeAllActivity: () => void;
  backLabel: string;
  /** Opens straight into public view, as "See public view" after funding does. */
  initialPublic?: boolean;
  /** When prices were last read; the live feed by default, a fixed value in tests. */
  pricesUpdatedAt?: number | null;
  /** Whether the screen has the focus: balances are re-read only while it does. */
  focused?: boolean;
};

/** How public view was entered: by its button, or by holding the mark (released, it leaves). */
type PublicMode = "off" | "button" | "held";

/** Spec 2.13: one portfolio, what it is worth, what it holds and what can be done with it. */
export function PortfolioScreen(props: PortfolioScreenProps) {
  const wallet = useWalletSnapshot();
  const unlocked = useIsUnlocked();
  const { updatedAt: live } = useLivePrices();
  const updatedAt = props.pricesUpdatedAt === undefined ? live : props.pricesUpdatedAt;
  const { useOnline } = useServices();
  const online = useOnline();
  const { id } = props;
  const { refresh: balances } = useMoney();
  const read = useCallback(
    async () => (await balances.portfolioBalances(id)) !== undefined,
    [balances, id],
  );
  const refresh = useBalanceRefresh(read, online, useInView(props.focused ?? true));
  const inEarn = usePortfolioEarn(id);
  const [publicMode, setPublicMode] = useState<PublicMode>(props.initialPublic ? "button" : "off");
  const [settings, setSettings] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const [entries, setEntries] = useState(0);

  const enterPublic = useCallback((mode: Exclude<PublicMode, "off">) => {
    if (mode === "held") mediumHaptic();
    setPublicMode(mode);
    setEntries((count) => count + 1);
    AccessibilityInfo.announceForAccessibility(copy.publicView.announce);
  }, []);

  const firstRead = refresh.reading && !refresh.settled;
  const waiting = useWaiting(firstRead, "content");
  useTopLoader(refresh.reading);

  if (!wallet) return null;
  const view = portfolioView(screenReads, wallet, id, updatedAt, inEarn);

  if (view.kind === "missing") {
    return (
      <Screen>
        <TopBar backLabel={props.backLabel} onBack={props.onBack} />
        <View style={styles.missing}>
          <Text variant="h2">{view.message}</Text>
          <Button variant="quiet" label={view.back} onPress={props.onBack} />
        </View>
      </Screen>
    );
  }

  const portfolio = wallet.portfolios.find((entry) => entry.id === id)!;
  const inPublic = unlocked && publicMode !== "off";

  const loading = firstRead && view.holdings === null && view.empty !== null;

  return (
    <View style={styles.safe}>
      <View
        style={styles.flex}
        importantForAccessibility={inPublic ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={inPublic}
      >
        <RefreshScreen
          refreshing={refresh.refreshing}
          onRefresh={refresh.pull}
          top={<IdentityLine tint={view.icon.tint} />}
        >
          <TopBar
            backLabel={props.backLabel}
            onBack={props.onBack}
            onSettings={() => setSettings(true)}
          />
          <View style={styles.sections}>
            <Header
              view={view}
              loading={loading ? waiting : null}
              failed={refresh.failed}
              onRetry={online ? refresh.retry : undefined}
              onEnterPublic={enterPublic}
              onRelease={() => setPublicMode((mode) => (mode === "held" ? "off" : mode))}
            />
            {view.archived ? (
              <Panel style={styles.group}>
                <Text style={styles.medium}>{view.archived.title}</Text>
                <Text variant="note">{view.archived.lead}</Text>
                <Button label={view.archived.restore} onPress={() => void setArchived(id, false)} />
                <Button
                  variant="quiet"
                  label={view.archived.settings}
                  onPress={() => setSettings(true)}
                />
              </Panel>
            ) : (
              <Actions view={view} online={online} onAction={props.onAction} />
            )}
            {view.mix && <Mix mix={view.mix} online={online} onAction={props.onAction} />}
            {view.empty && (
              <View style={styles.empty}>
                <PieRing target={[100]} current={[0]} label={view.empty.title} size={88} />
                <Text>{view.empty.title}</Text>
                <Button
                  label={view.empty.button.label}
                  disabled={!online}
                  onPress={() => props.onAction(view.empty!.button.action)}
                  style={styles.stretch}
                />
                {view.empty.caption && <Text variant="faint">{view.empty.caption}</Text>}
              </View>
            )}
            {view.holdings && (
              <Section title={view.holdings.title}>
                {view.holdings.rows.map((row) => (
                  <HoldingRow key={row.key} row={row} online={online} onAction={props.onAction} />
                ))}
              </Section>
            )}
            {loading && (
              <WaitingPlaceholder waiting={waiting}>
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton key={index} height={48} />
                ))}
              </WaitingPlaceholder>
            )}
            <Section
              title={view.activity.title}
              trailing={
                view.activity.rows.length > 0 ? (
                  <Button
                    variant="quiet"
                    label={commonCopy.seeAll}
                    onPress={props.onSeeAllActivity}
                    style={styles.compact}
                  />
                ) : undefined
              }
            >
              {view.activity.rows.length === 0 ? (
                <Text variant="faint">{view.activity.empty}</Text>
              ) : (
                view.activity.rows.map((row) => (
                  <ActivityRow key={row.id} row={row} onPress={() => setOpened(row.id)} />
                ))
              )}
            </Section>
            <Button
              variant="quiet"
              label={copy.detail.seePublicView}
              onPress={() => enterPublic("button")}
            />
          </View>
        </RefreshScreen>
      </View>
      <FadeLayer visible={inPublic}>
        <SafeAreaView style={styles.safe}>
          <IdentityLine tint={view.icon.tint} />
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            indicatorStyle="white"
          >
            <PublicView key={entries} portfolio={portfolio} wallet={wallet} />
          </ScrollView>
          <View style={styles.footer}>
            <PublicViewExit onExit={() => setPublicMode("off")} />
          </View>
        </SafeAreaView>
      </FadeLayer>
      <PortfolioSettingsSheet
        portfolioId={id}
        open={settings}
        onClose={() => setSettings(false)}
        pricesUpdatedAt={updatedAt}
      />
      <ActivityDetailSheet
        entryId={opened}
        onClose={() => setOpened(null)}
        onOpenPortfolio={props.onOpenPortfolio}
      />
    </View>
  );
}

function TopBar({
  backLabel,
  onBack,
  onSettings,
}: {
  backLabel: string;
  onBack: () => void;
  onSettings?: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <CaretLeftIcon size={size.icon} color={colors.ink} />
        <Text>{backLabel}</Text>
      </Pressable>
      {onSettings && (
        <IconButton label={copy.detail.moreLabel} onPress={onSettings}>
          <DotsThreeIcon size={size.icon} color={colors.ink} weight="bold" />
        </IconButton>
      )}
    </View>
  );
}

function Header({
  view,
  loading,
  failed,
  onRetry,
  onEnterPublic,
  onRelease,
}: {
  view: PortfolioDetailView;
  /** The first read's wait, while nothing is stored to show; null otherwise. */
  loading: Waiting | null;
  failed: boolean;
  /** Absent while offline: the banner says why nothing can be read. */
  onRetry?: () => void;
  onEnterPublic: (mode: "button" | "held") => void;
  onRelease: () => void;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.identity}>
        <Pressable
          accessibilityRole="image"
          accessibilityLabel={view.name}
          accessibilityActions={[{ name: "publicView", label: copy.publicView.markAction }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "publicView") onEnterPublic("button");
          }}
          onLongPress={() => onEnterPublic("held")}
          onPressOut={onRelease}
          delayLongPress={400}
        >
          <IdentityMark glyph={view.icon.glyph} tint={view.icon.tint} size="lg" />
        </Pressable>
        <View style={styles.flex}>
          <Text variant="h2" numberOfLines={2}>
            {view.name}
          </Text>
          <Text variant="faint">{view.kindLine}</Text>
        </View>
      </View>
      <View style={styles.value}>
        <Text variant="faint">{view.valueLabel}</Text>
        {loading ? (
          <WaitingPlaceholder waiting={{ ...loading, stillWorking: null }}>
            <Skeleton width="60%" height={42} />
          </WaitingPlaceholder>
        ) : view.valueUnavailable ? (
          <Text>{view.value}</Text>
        ) : (
          <View accessible accessibilityLabel={`${view.valueLabel}, ${view.value}`}>
            <FittedFigure value={view.value} />
          </View>
        )}
        <Text variant="note">{view.cashLine}</Text>
        {view.inEarn && <Text variant="note">{`${view.inEarn.label} ${view.inEarn.value}`}</Text>}
        {failed && (
          <View style={styles.retry}>
            <Text variant="faint" accessibilityLiveRegion="polite">
              {copy.detail.refreshFailed}
            </Text>
            {onRetry && (
              <Button
                variant="quiet"
                label={commonCopy.tryAgain}
                onPress={onRetry}
                style={styles.compact}
              />
            )}
          </View>
        )}
      </View>
      {view.pending && <Notice tone="warning">{view.pending}</Notice>}
    </View>
  );
}

function Actions({
  view,
  online,
  onAction,
}: {
  view: PortfolioDetailView;
  online: boolean;
  onAction: (action: PortfolioAction) => void;
}) {
  const press = (button: ActionButton) => () => onAction(button.action);
  return (
    <View style={styles.group}>
      {view.primary && (
        <Button label={view.primary.label} disabled={!online} onPress={press(view.primary)} />
      )}
      {view.rebalance && (
        <Button
          variant="quiet"
          label={view.rebalance.label}
          disabled={!online}
          onPress={press(view.rebalance)}
        />
      )}
      <View style={styles.quietRow}>
        {view.quiet.map((button) => (
          <View key={button.label} style={styles.quiet}>
            <Button
              variant="quiet"
              label={button.label}
              disabled={!online || button.disabled}
              onPress={press(button)}
              style={styles.quietButton}
            />
            {button.action.to === "send" && view.sendReason && (
              <Text variant="faint" style={styles.reason}>
                {view.sendReason}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function Mix({
  mix,
  online,
  onAction,
}: {
  mix: MixView;
  online: boolean;
  onAction: (action: PortfolioAction) => void;
}) {
  return (
    <Section
      title={mix.title}
      trailing={
        mix.edit ? (
          <Button
            variant="quiet"
            label={mix.edit}
            onPress={() => onAction({ to: "editMix" })}
            style={styles.compact}
          />
        ) : undefined
      }
    >
      <View style={styles.ring}>
        <PieRing target={mix.target} current={mix.current} label={mix.ringLabel} size={120}>
          <Text variant="faint">{mix.centre.label}</Text>
          {mix.centre.value && <Text style={styles.centreValue}>{mix.centre.value}</Text>}
        </PieRing>
      </View>
      {mix.slices.map((slice) => (
        <View key={slice.symbol} style={styles.slice}>
          <View style={styles.sliceRow}>
            <TrackerMark symbol={slice.symbol} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${slice.name}, ${slice.line}, ${slice.trailing}`}
              onPress={() => onAction({ to: "tracker", symbol: slice.symbol })}
              style={styles.flex}
            >
              <Text numberOfLines={1}>{slice.name}</Text>
              <Text variant="faint" tone={slice.drift ? "warning" : undefined}>
                {slice.line}
              </Text>
            </Pressable>
            <Text style={styles.figure}>{slice.trailing}</Text>
            {slice.sell && (
              <Button
                variant="quiet"
                label={portfolioCopy.holdings.sell}
                accessibilityLabel={slice.sell}
                disabled={!online}
                onPress={() => onAction({ to: "sell", symbol: slice.symbol })}
                style={styles.compact}
              />
            )}
          </View>
          <View aria-hidden style={styles.bar4}>
            <View style={[styles.fill, { width: `${Math.min(slice.current, 100)}%` }]} />
            <View style={[styles.tick, { left: `${Math.min(slice.target, 100)}%` }]} />
          </View>
        </View>
      ))}
    </Section>
  );
}

function HoldingRow({
  row,
  online,
  onAction,
}: {
  row: HoldingRowView;
  online: boolean;
  onAction: (action: PortfolioAction) => void;
}) {
  const body = (
    <>
      <TrackerMark symbol={row.caption} />
      <View style={styles.flex}>
        <Text numberOfLines={1}>{row.name}</Text>
        <Text variant="faint">{row.caption}</Text>
      </View>
      <View style={styles.figures}>
        <Text style={styles.figure}>{row.amount}</Text>
        {row.value && (
          <Text variant="faint" style={styles.figure}>
            {row.value}
          </Text>
        )}
      </View>
    </>
  );
  return (
    <View style={styles.holding}>
      <View style={styles.holdingRow}>
        {row.tracker ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={row.spoken}
            onPress={() => onAction({ to: "tracker", symbol: row.tracker! })}
            style={({ pressed }) => [styles.holdingBody, pressed && styles.pressed]}
          >
            {body}
          </Pressable>
        ) : (
          <View accessible accessibilityLabel={row.spoken} style={styles.holdingBody}>
            {body}
          </View>
        )}
        {row.sell && (
          <Button
            variant="quiet"
            label={portfolioCopy.holdings.sell}
            accessibilityLabel={row.sell.label}
            disabled={!online || row.sell.disabled}
            onPress={() => onAction({ to: "sell", symbol: row.key })}
            style={styles.compact}
          />
        )}
      </View>
      {row.sell?.reason && <Text variant="faint">{row.sell.reason}</Text>}
    </View>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.sectionHead}>
        <Text variant="h2" style={styles.flex}>
          {title}
        </Text>
        {trailing}
      </View>
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.gutter, gap: layout.section },
  footer: { paddingHorizontal: layout.gutter, paddingVertical: layout.tight },
  sections: { gap: layout.section },
  bar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -layout.tight,
  },
  back: {
    minHeight: size.minTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.hairline,
    paddingRight: layout.tight,
  },
  pressed: { opacity: opacity.pressed },
  group: { gap: layout.tight },
  medium: { fontFamily: fonts.medium },
  missing: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: layout.group },
  identity: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  value: { gap: layout.tight, paddingTop: layout.tight },
  retry: { gap: layout.tight, alignItems: "flex-start" },
  quietRow: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  quiet: { flexGrow: 1, flexBasis: 96, gap: layout.hairline },
  quietButton: { paddingHorizontal: layout.tight },
  reason: { textAlign: "center" },
  empty: { alignItems: "center", gap: layout.inset, paddingVertical: layout.group },
  stretch: { alignSelf: "stretch" },
  ring: { alignItems: "center", paddingVertical: layout.tight },
  centreValue: { fontVariant: ["tabular-nums"] },
  slice: { gap: layout.hairline, paddingVertical: layout.tight },
  sliceRow: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  bar4: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors["line-subtle"],
    overflow: "visible",
  },
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.dim },
  tick: {
    position: "absolute",
    top: -2,
    width: 2,
    height: 8,
    marginLeft: -1,
    backgroundColor: colors["ink-strong"],
  },
  holding: { gap: layout.hairline },
  holdingRow: { flexDirection: "row", alignItems: "center", gap: layout.tight },
  holdingBody: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
    paddingVertical: layout.tight,
  },
  figures: { alignItems: "flex-end", gap: layout.hairline, flexShrink: 0 },
  figure: { fontVariant: ["tabular-nums"], textAlign: "right" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: layout.tight },
  compact: { minHeight: size.minTarget, paddingHorizontal: layout.inset },
  flex: { flex: 1, minWidth: 0 },
});
