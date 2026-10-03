import { resolvePortfolioIcon } from "@noirwire/shared/domain";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, IdentityMark, Notice, Skeleton, Text } from "@/ui";
import { readAsOne } from "@/ui/accessibility";
import { selectionHaptic } from "@/ui/haptics";
import { colors, layout, opacity } from "@/ui/theme";
import type { EarnAction } from "@noirwire/shared/application";
import { earnScreenView, type EarnRowView } from "./earnView";
import { EarnSheet } from "./EarnSheet";
import type { EarnOpening } from "./useEarnFlow";
import { useEarnScreen } from "./useEarnScreen";

type EarnScreenProps = {
  onReadRisks: () => void;
  onNewPortfolio: () => void;
  /** Opens fund for a portfolio whose cash cannot cover a deposit's network cost. */
  onMoveMoney: (portfolioId: string) => void;
};

/** Spec 2.26: today's lending rate, and how much of each portfolio's cash is earning it. */
export function EarnScreen({ onReadRisks, onNewPortfolio, onMoveMoney }: EarnScreenProps) {
  const state = useEarnScreen();
  const [opening, setOpening] = useState<EarnOpening | null>(null);
  const view = earnScreenView(state);

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
        <View style={styles.bar}>
          <Text variant="h1">{view.title}</Text>
          <Text variant="faint">{view.venue}</Text>
        </View>

        {view.empty ? (
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
                <Skeleton width={140} height={46} />
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
            </View>

            {view.mainnetOnly && <Notice tone="warning">{view.mainnetOnly}</Notice>}

            <View style={styles.actions}>
              <Button
                label={view.deposit.label}
                disabled={view.deposit.disabled}
                onPress={() => open("deposit", null)}
              />
              {view.deposit.reason && <Text variant="note">{view.deposit.reason}</Text>}
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
                  onOpen={(action) => open(action, row.id)}
                />
              ))}
            </View>

            <View style={styles.risk}>
              <Text variant="note">{view.riskLine}</Text>
              <Button label={view.readRisks} variant="quiet" onPress={onReadRisks} />
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
          venue={state.venue}
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
  onOpen,
}: {
  row: EarnRowView;
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
          <Skeleton width={64} />
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
  bar: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
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
