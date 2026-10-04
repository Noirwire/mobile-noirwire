import { appCopy, commonCopy, mobilePortfolioCopy, portfolioCopy } from "@noirwire/shared/copy";
import {
  homeView,
  type HomeAction,
  type HomeTarget,
  type HomeView,
} from "@noirwire/shared/presentation";
import { screenReads } from "@noirwire/shared/wallet";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  BalanceHeader,
  Button,
  IconButton,
  Mark,
  Panel,
  Row,
  Skeleton,
  Text,
  useTopLoader,
  useWaiting,
  WaitingPlaceholder,
  type Waiting,
} from "@/ui";
import { ActionNotice } from "@/ui/ActionNotice";
import { RefreshScreen } from "@/ui/RefreshScreen";
import { colors, layout, opacity, size } from "@/ui/theme";
import { ActivityDetailSheet } from "../activity/ActivityDetailSheet";
import { ActivityRow } from "../activity/ActivityRow";
import { useEarnTotal } from "../earn/useEarnScreen";
import { useMoney } from "../network/money";
import { setArchived } from "../portfolio/portfolioActions";
import { PortfolioRow } from "../portfolio/PortfolioRow";
import { TrackerMark } from "@/ui/TrackerMark";
import { useBalanceRefresh } from "../portfolio/useBalanceRefresh";
import { useLivePrices, useWalletSnapshot } from "../portfolio/useWalletSnapshot";
import { phoneCopy } from "../phoneCopy";
import { useServices } from "../services";
import { TextToggle } from "./TextToggle";

const copy = { ...portfolioCopy.home, ...mobilePortfolioCopy.home };

/** How long "Restored." stays under a restored portfolio. */
export const RESTORED_MS = 2_000;

type HomeScreenProps = {
  onNavigate: (target: HomeTarget) => void;
  onOpenPortfolio: (id: string) => void;
  onOpenTracker: (symbol: string) => void;
  onNewPortfolio: () => void;
  onSeeAllActivity: () => void;
  /** Opens the Earn tab, from the row that says what is in Earn. */
  onOpenEarn: () => void;
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
  const refresh = useBalanceRefresh(useMoney().refresh.everything, online);
  const earnTotal = useEarnTotal();
  const [opened, setOpened] = useState<string | null>(null);
  const firstRead = refresh.reading && !refresh.settled;
  const waiting = useWaiting(firstRead, "content");
  useTopLoader(refresh.reading);

  if (!wallet) return null;
  const view = homeView(screenReads, wallet, updatedAt, earnTotal);
  const storedNothing =
    view.empty && wallet.activity.length === 0 && view.archived.rows.length === 0;
  const loading = firstRead && storedNothing;

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

      {loading ? (
        <BalanceSkeleton waiting={waiting} />
      ) : (
        <Balance
          view={view}
          failed={refresh.failed}
          onRetry={online ? refresh.retry : undefined}
          onOpenEarn={props.onOpenEarn}
        />
      )}

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
        loading={loading ? waiting : null}
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
        <Section title={copy.yourInvestments}>
          {view.investments.length === 0 ? (
            <Text variant="faint">{copy.noInvestmentsYet}</Text>
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
          title={copy.recentActivity}
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

function Balance({
  view,
  failed,
  onRetry,
  onOpenEarn,
}: {
  view: HomeView;
  failed: boolean;
  /** Absent while offline: the banner says why nothing can be read. */
  onRetry?: () => void;
  onOpenEarn: () => void;
}) {
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
        <View style={styles.together}>
          <Text variant="faint" accessibilityLiveRegion="polite">
            {copy.refreshFailed}
          </Text>
          {onRetry && (
            <Button
              variant="quiet"
              label={phoneCopy.tryAgain}
              onPress={onRetry}
              style={styles.compact}
            />
          )}
        </View>
      )}
      <Row label={view.cash.label} value={view.cash.value} last={view.earning === null} />
      {view.earning && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${view.earning.label}, ${view.earning.value}`}
          onPress={onOpenEarn}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Row label={view.earning.label} value={view.earning.value} last />
        </Pressable>
      )}
    </View>
  );
}

function BalanceSkeleton({ waiting }: { waiting: Waiting }) {
  return (
    <View style={styles.skeleton}>
      <WaitingPlaceholder waiting={waiting}>
        <Skeleton width="30%" height={14} />
        <Skeleton width="70%" height={42} />
        <Skeleton width="100%" height={20} />
      </WaitingPlaceholder>
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
  /** The first read's wait, while nothing is stored to show; null otherwise. */
  loading: Waiting | null;
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
      title={copy.portfolios}
      trailing={
        <Button
          variant="quiet"
          label={copy.new}
          accessibilityLabel={copy.newPortfolio}
          onPress={onNew}
          style={styles.compact}
        />
      }
    >
      {loading ? (
        <WaitingPlaceholder waiting={{ ...loading, stillWorking: null }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={64} />
          ))}
        </WaitingPlaceholder>
      ) : view.portfolios.length === 0 ? (
        <View style={styles.noPortfolios}>
          <Text tone="dim">{copy.createToStart}</Text>
          <Button variant="quiet" label={copy.newPortfolio} onPress={onNew} />
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
                accessibilityLabel={copy.restore(row.name)}
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
  skeleton: { paddingTop: layout.section },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  action: { flexGrow: 1, flexBasis: 150 },
  stacked: { flexDirection: "column", flexWrap: "nowrap", alignItems: "stretch" },
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
