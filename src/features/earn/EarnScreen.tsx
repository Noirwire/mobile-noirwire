import { commonCopy, mobileWaitingCopy } from "@noirwire/shared/copy";
import { resolvePortfolioIcon } from "@noirwire/shared/domain";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  EmptyState,
  IdentityMark,
  Skeleton,
  Text,
  useTopLoader,
  useWaiting,
  WaitingPlaceholder,
  type Waiting,
} from "@/ui";
import { readAsOne } from "@/ui/accessibility";
import { selectionHaptic } from "@/ui/haptics";
import { colors, layout, opacity } from "@/ui/theme";
import type { EarnAction } from "@noirwire/shared/application";
import { earnScreenView, type EarnRowView } from "@noirwire/shared/presentation";
import { EarnSheet } from "./EarnSheet";
import type { EarnOpening } from "./useEarnFlow";
import { useEarnScreen } from "./useEarnScreen";

type EarnScreenProps = {
  onNewPortfolio: () => void;
  /** Opens fund for a portfolio whose cash cannot cover a deposit's network cost. */
  onMoveMoney: (portfolioId: string) => void;
};

/** Spec 2.26: today's lending rate, and how much of each portfolio's cash is earning it. */
export function EarnScreen({ onNewPortfolio, onMoveMoney }: EarnScreenProps) {
  const state = useEarnScreen();
  const [opening, setOpening] = useState<EarnOpening | null>(null);
  const [risksOpen, setRisksOpen] = useState(false);
  const view = earnScreenView({ ...state, platform: "mobile" });
  const reading =
    view.notHere === null && (view.rate === null || view.rows.some((row) => row.inEarn === null));
  const waiting = useWaiting(reading, "content");
  useTopLoader(reading);
  /** A rate or a position that could not be read: said, with a way to ask again. */
  const unread =
    state.available &&
    (view.rate?.unavailable === true ||
      state.portfolios.some((portfolio) => portfolio.position === null));

  function open(action: EarnAction, portfolioId: string | null) {
    setOpening({ action, portfolioId });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "left"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={state.refresh}
            tintColor={colors.dim}
          />
        }
      >
        <Text variant="h1">{view.title}</Text>

        {view.notHere ? (
          <Text tone="dim">{view.notHere}</Text>
        ) : view.empty ? (
          <EmptyState
            title={view.empty.title}
            detail={view.empty.detail}
            action={<Button label={view.empty.action} variant="quiet" onPress={onNewPortfolio} />}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <Text variant="faint">{view.rateLabel}</Text>
              {view.rate === null ? (
                <WaitingPlaceholder waiting={waiting}>
                  <Skeleton width={140} height={46} />
                </WaitingPlaceholder>
              ) : (
                <Text
                  variant={view.rate.unavailable ? "body" : "display"}
                  accessibilityLabel={view.rate.announcement}
                >
                  {view.rate.value}
                </Text>
              )}
              {view.couldEarn && <Text tone="dim">{view.couldEarn}</Text>}
              {view.breakdown && <Text variant="faint">{view.breakdown}</Text>}
              {unread && !reading && (
                <View style={styles.risk}>
                  <Text variant="faint" accessibilityLiveRegion="polite">
                    {mobileWaitingCopy.overdue.earn}
                  </Text>
                  {state.online && (
                    <Button variant="quiet" label={commonCopy.tryAgain} onPress={state.reload} />
                  )}
                </View>
              )}
            </View>

            <View style={styles.actions}>
              {view.deposit && (
                <Button
                  label={view.deposit.label}
                  disabled={view.deposit.disabled}
                  onPress={() => open("deposit", null)}
                />
              )}
              {view.deposit?.reason && <Text variant="note">{view.deposit.reason}</Text>}
              {view.withdraw && (
                <Button
                  label={view.withdraw.label}
                  variant="quiet"
                  disabled={view.withdraw.disabled}
                  onPress={() => open("withdraw", null)}
                />
              )}
            </View>

            <View style={styles.section}>
              <Text variant="label" accessibilityRole="header">
                {view.portfoliosTitle}
              </Text>
              {view.rows.map((row) => (
                <PortfolioRow
                  key={row.id}
                  row={row}
                  inEarnCaption={view.inEarn}
                  icon={state.icons[row.id]}
                  waiting={waiting}
                  onOpen={(action) => open(action, row.id)}
                />
              ))}
            </View>

            <View style={styles.risk}>
              <Text variant="note">{view.riskLine}</Text>
              <Button
                label={view.risks.title}
                variant="quiet"
                aria-expanded={risksOpen}
                onPress={() => setRisksOpen(!risksOpen)}
              />
              {risksOpen &&
                view.risks.lines.map((line) => (
                  <Text key={line} tone="dim">
                    {line}
                  </Text>
                ))}
            </View>
          </>
        )}
      </ScrollView>

      {opening && (
        <EarnSheet
          opening={opening}
          portfolios={state.portfolios}
          icons={state.icons}
          positionOf={state.positionOf}
          apy={state.rate?.apy}
          onClose={() => {
            setOpening(null);
            state.reload();
          }}
          onMoveMoney={(id) => {
            setOpening(null);
            onMoveMoney(id);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function PortfolioRow({
  row,
  inEarnCaption,
  icon,
  waiting,
  onOpen,
}: {
  row: EarnRowView;
  waiting: Waiting;
  inEarnCaption: string;
  icon: Parameters<typeof resolvePortfolioIcon>[0];
  onOpen: (action: EarnAction) => void;
}) {
  const opens = row.opens;
  return (
    <Pressable
      {...readAsOne}
      accessibilityRole="button"
      accessibilityLabel={row.announcement}
      accessibilityHint={row.restore ?? undefined}
      accessibilityState={{ disabled: opens === null }}
      disabled={opens === null}
      onPress={() => {
        if (!opens) return;
        selectionHaptic();
        onOpen(opens);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IdentityMark {...resolvePortfolioIcon(icon)} size="md" />
      <View style={styles.copy}>
        <Text numberOfLines={1}>{row.label}</Text>
        <Text variant="note">{row.cash}</Text>
        {row.archived && (
          <Text variant="note" tone="warning">
            {row.archived}
          </Text>
        )}
        {row.restore && <Text variant="faint">{row.restore}</Text>}
      </View>
      <View style={styles.trailing}>
        {row.inEarn === null ? (
          <WaitingPlaceholder waiting={{ ...waiting, stillWorking: null }}>
            <Skeleton width={64} />
          </WaitingPlaceholder>
        ) : (
          <Text style={styles.figure}>{row.inEarn}</Text>
        )}
        <Text variant="faint">{inEarnCaption}</Text>
        {row.earned && (
          <Text variant="faint" tone="safe">
            {row.earned}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: layout.gutter, gap: layout.section },
  hero: { gap: layout.tight },
  actions: { gap: layout.tight },
  section: { gap: layout.tight },
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.inset,
    paddingVertical: layout.tight,
    borderBottomWidth: 1,
    borderBottomColor: colors["line-subtle"],
  },
  pressed: { opacity: opacity.pressed },
  copy: { flex: 1, gap: layout.hairline },
  trailing: { alignItems: "flex-end", gap: layout.hairline },
  figure: { fontVariant: ["tabular-nums"] },
  risk: { gap: layout.tight, alignItems: "flex-start" },
});
