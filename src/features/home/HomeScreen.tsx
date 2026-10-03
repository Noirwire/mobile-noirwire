import { appCopy, commonCopy, portfolioCopy } from "@noirwire/shared/copy";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BalanceHeader, Button, IconButton, Mark, Panel, Row, Skeleton, Text } from "@/ui";
import { ActionNotice } from "@/ui/ActionNotice";
import { RefreshScreen } from "@/ui/RefreshScreen";
import { colors, layout, opacity, size } from "@/ui/theme";
import { ActivityDetailSheet } from "../activity/ActivityDetailSheet";
import { ActivityRow } from "../activity/ActivityRow";
import type { BalanceReads } from "../portfolio/balanceReads";
import { setArchived } from "../portfolio/portfolioActions";
import { PortfolioRow } from "../portfolio/PortfolioRow";
import { TrackerMark } from "@/ui/TrackerMark";
import { useBalanceRefresh } from "../portfolio/useBalanceRefresh";
import { useLivePrices, useWalletSnapshot } from "../portfolio/useWalletSnapshot";
import { useServices } from "../services";
import { mobileHomeCopy as copy } from "./copy";
import { TextToggle } from "./TextToggle";
import { homeView, type HomeAction, type HomeTarget, type HomeView } from "./homeView";

/** How long "Restored." stays under a restored portfolio. */
export const RESTORED_MS = 2_000;

type HomeScreenProps = {
  balances: BalanceReads;
  onNavigate: (target: HomeTarget) => void;
  onOpenPortfolio: (id: string) => void;
  onOpenTracker: (symbol: string) => void;
  onNewPortfolio: () => void;
  onSeeAllActivity: () => void;
  onLock: () => void;
  /** When prices were last read; the live feed by default, a fixed value in tests. */
  pricesUpdatedAt?: number | null;
};

/** Spec 2.12: everything in one place, while each portfolio visibly stands on its own. */
export function HomeScreen(props: HomeScreenProps) {
  const wallet = useWalletSnapshot();
  const live = useLivePrices();
  const updatedAt = props.pricesUpdatedAt === undefined ? live : props.pricesUpdatedAt;
  const { useOnline } = useServices();
  const online = useOnline();
  const refresh = useBalanceRefresh(props.balances.everything, online);
  const [opened, setOpened] = useState<string | null>(null);

  if (!wallet) return null;
  const view = homeView(wallet, updatedAt);
  const storedNothing =
    view.empty && wallet.activity.length === 0 && view.archived.rows.length === 0;
  const loading = refresh.reading && !refresh.settled && storedNothing;

  return (
    <RefreshScreen refreshing={refresh.refreshing} onRefresh={refresh.pull}>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Mark size={22} />
          <Text>{appCopy.name}</Text>
        </View>
        <IconButton label={appCopy.nav.lock} onPress={props.onLock}>
          <LockIcon size={size.icon} color={colors.ink} />
        </IconButton>
      </View>

      {loading ? <BalanceSkeleton /> : <Balance view={view} failed={refresh.failed} />}

      {view.waiting && (
        <ActionNotice
          action={
            view.waiting.action && (
              <Button
                label={view.waiting.action.label}
                onPress={() => props.onNavigate(view.waiting!.action!.target)}
              />
            )
          }
        >
          {view.waiting.text}
        </ActionNotice>
      )}

      <Actions view={view} onNavigate={props.onNavigate} />

      {view.empty && <HowTo view={view} />}

      <Portfolios
        view={view}
        loading={loading}
        onOpen={props.onOpenPortfolio}
        onNew={props.onNewPortfolio}
      />

      {view.empty && (
        <Button
          variant="quiet"
          label={copy.lookAtTrackers}
          onPress={() => props.onNavigate({ to: "markets" })}
        />
      )}

      {!view.empty && (
        <Section title={portfolioCopy.home.yourInvestments}>
          {view.investments.length === 0 ? (
            <Text variant="faint">{copy.noInvestments}</Text>
          ) : (
            view.investments.map((row) => (
              <Pressable
                key={row.symbol}
                accessibilityRole="button"
                accessibilityLabel={row.spoken}
                onPress={() => props.onOpenTracker(row.symbol)}
                style={({ pressed }) => [styles.investment, pressed && styles.pressed]}
              >
                <TrackerMark symbol={row.symbol} />
                <View style={styles.flex}>
                  <Text numberOfLines={1}>{row.name}</Text>
                  <Text variant="faint" numberOfLines={1}>
                    {row.caption}
                  </Text>
                </View>
                <Text style={styles.figure}>{row.value}</Text>
              </Pressable>
            ))
          )}
        </Section>
      )}

      {view.recent.length > 0 && (
        <Section
          title={portfolioCopy.home.recentActivity}
          trailing={
            <Button
              variant="quiet"
              label={commonCopy.seeAll}
              onPress={props.onSeeAllActivity}
              style={styles.compact}
            />
          }
        >
          {view.recent.map((row) => (
            <ActivityRow key={row.id} row={row} onPress={() => setOpened(row.id)} />
          ))}
        </Section>
      )}

      <ActivityDetailSheet
        entryId={opened}
        onClose={() => setOpened(null)}
        onOpenPortfolio={props.onOpenPortfolio}
      />
    </RefreshScreen>
  );
}

function Balance({ view, failed }: { view: HomeView; failed: boolean }) {
  const [explained, setExplained] = useState(false);
  return (
    <View style={styles.balance}>
      <BalanceHeader
        label={view.total.label}
        value={view.total.value}
        unavailable={view.total.unavailable}
        change={view.total.change}
        changeTone={view.total.changeTone}
      />
      <View style={styles.together}>
        <TextToggle
          label={copy.togetherOnlyHere}
          expanded={explained}
          onPress={() => setExplained(!explained)}
        />
        {explained && <Text variant="faint">{copy.togetherExplained}</Text>}
      </View>
      {failed && (
        <Text variant="faint" accessibilityLiveRegion="polite">
          {copy.refreshFailed}
        </Text>
      )}
      <Row label={view.cash.label} value={view.cash.value} last />
    </View>
  );
}

function BalanceSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton width="30%" height={14} />
      <Skeleton width="70%" height={42} />
      <Skeleton width="100%" height={20} />
    </View>
  );
}

function ActionButton({
  action,
  variant,
  stacked,
  onNavigate,
}: {
  action: HomeAction;
  variant: "primary" | "quiet";
  stacked: boolean;
  onNavigate: (target: HomeTarget) => void;
}) {
  return (
    <Button
      variant={variant}
      label={action.label}
      onPress={() => onNavigate(action.target)}
      style={stacked ? undefined : styles.action}
    />
  );
}

function Actions({ view, onNavigate }: { view: HomeView; onNavigate: (t: HomeTarget) => void }) {
  return (
    <View style={[styles.actions, view.empty && styles.stacked]}>
      <ActionButton
        action={view.primary}
        variant={view.actionsQuiet ? "quiet" : "primary"}
        stacked={view.empty}
        onNavigate={onNavigate}
      />
      <ActionButton
        action={view.secondary}
        variant="quiet"
        stacked={view.empty}
        onNavigate={onNavigate}
      />
    </View>
  );
}

function HowTo({ view }: { view: HomeView }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.howTo}>
      <TextToggle label={copy.howToAddMoney} expanded={open} onPress={() => setOpen(!open)} />
      {open && (
        <Panel style={styles.steps}>
          {view.howTo.steps.map((step) => (
            <View key={step.title} style={styles.step}>
              <Text>{step.title}</Text>
              <Text variant="note">{step.detail}</Text>
            </View>
          ))}
          <Text variant="faint">{view.howTo.footnote}</Text>
        </Panel>
      )}
    </View>
  );
}

function Portfolios({
  view,
  loading,
  onOpen,
  onNew,
}: {
  view: HomeView;
  loading: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [restored, setRestored] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function restore(id: string) {
    void setArchived(id, false);
    setRestored(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRestored(null), RESTORED_MS);
  }

  return (
    <Section
      title={portfolioCopy.home.portfolios}
      trailing={
        <Button
          variant="quiet"
          label={portfolioCopy.home.new}
          accessibilityLabel={copy.newPortfolioLabel}
          onPress={onNew}
          style={styles.compact}
        />
      }
    >
      {loading ? (
        [0, 1, 2].map((index) => <Skeleton key={index} height={64} />)
      ) : view.portfolios.length === 0 ? (
        <View style={styles.noPortfolios}>
          <Text tone="dim">{portfolioCopy.home.createToStart}</Text>
          <Button variant="quiet" label={copy.newPortfolioLabel} onPress={onNew} />
        </View>
      ) : (
        view.portfolios.map((row) => (
          <View key={row.id}>
            <PortfolioRow row={row} onPress={() => onOpen(row.id)} />
            {restored === row.id && (
              <Text variant="faint" accessibilityLiveRegion="polite">
                {copy.restored}
              </Text>
            )}
          </View>
        ))
      )}
      {view.archived.rows.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showArchived }}
          onPress={() => setShowArchived(!showArchived)}
          style={({ pressed }) => [styles.archivedToggle, pressed && styles.pressed]}
        >
          <Text tone="dim">{view.archived.heading}</Text>
        </Pressable>
      )}
      {showArchived &&
        view.archived.rows.map((row) => (
          <PortfolioRow
            key={row.id}
            row={row}
            dimmed
            onPress={() => onOpen(row.id)}
            trailing={
              <Button
                variant="quiet"
                label={commonCopy.restore}
                accessibilityLabel={copy.restoreLabel(row.name)}
                onPress={() => restore(row.id)}
                style={styles.compact}
              />
            }
          />
        ))}
    </Section>
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
    <View style={styles.section}>
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
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: layout.tight },
  balance: { gap: layout.tight },
  together: { gap: layout.tight, alignItems: "flex-start" },
  skeleton: { gap: layout.inset, paddingTop: layout.section },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  action: { flexGrow: 1, flexBasis: 150 },
  stacked: { flexDirection: "column" },
  howTo: { gap: layout.tight, alignItems: "stretch" },
  steps: { gap: layout.group },
  step: { gap: layout.hairline },
  section: { gap: layout.tight },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: layout.tight },
  compact: { minHeight: size.minTarget, paddingHorizontal: layout.inset },
  noPortfolios: { gap: layout.tight, alignItems: "flex-start" },
  archivedToggle: { minHeight: size.minTarget, justifyContent: "center" },
  investment: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
    paddingVertical: layout.tight,
  },
  pressed: { opacity: opacity.pressed },
  flex: { flex: 1, minWidth: 0 },
  figure: { fontVariant: ["tabular-nums"], textAlign: "right" },
});
