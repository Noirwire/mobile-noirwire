import { commonCopy } from "@noirwire/shared/copy";
import { fundingWalletView, WAIT_LIMIT_MS } from "@noirwire/shared/presentation";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Skeleton, Text, useWaiting, WaitingPlaceholder } from "@/ui";
import { colors, layout } from "@/ui/theme";
import { withinLimit } from "@/ui/useWaiting";
import { useServices } from "../services";
import { useMoney } from "../network/money";
import { useWalletSnapshot } from "../network/useWalletSnapshot";

type FundingWalletScreenProps = {
  onMove: () => void;
  onAddMoney: () => void;
};

const CASH = "USDC";

/** Spec 2.31: what is waiting in the funding wallet, and the way to add more. */
export function FundingWalletScreen({ onMove, onAddMoney }: FundingWalletScreenProps) {
  const money = useMoney();
  const online = useServices().useOnline();
  const wallet = useWalletSnapshot();
  const address = wallet?.funding.address;
  const [read, setRead] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!address) return;
    let current = true;
    withinLimit(money.refresh.funding(address, CASH), WAIT_LIMIT_MS.content)
      .then(
        () => current && setReadFailed(false),
        () => current && setReadFailed(true),
      )
      .finally(() => {
        if (!current) return;
        setRead(true);
        setRefreshing(false);
      });
    return () => {
      current = false;
    };
  }, [money, address, version]);

  const waiting = useWaiting(!read, "content");

  const view = fundingWalletView({
    balance: read && wallet ? (wallet.funding.tokens[CASH] ?? 0) : null,
    readFailed,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["right", "bottom", "left"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.dim}
            onRefresh={() => {
              if (!online) return;
              setRefreshing(true);
              setVersion((count) => count + 1);
            }}
          />
        }
      >
        <View style={styles.hero}>
          <Text variant="faint">{view.waiting}</Text>
          {view.balance === null ? (
            <WaitingPlaceholder waiting={waiting}>
              <Skeleton width={180} height={46} />
            </WaitingPlaceholder>
          ) : (
            <Text variant="display" accessibilityLabel={view.balanceLabel ?? undefined}>
              {view.balance}
            </Text>
          )}
          <Text tone="dim">{view.lead}</Text>
          {view.readFailed && (
            <View style={styles.retry}>
              <Text variant="note" tone="warning" accessibilityRole="alert">
                {view.readFailed}
              </Text>
              {online && (
                <Button
                  label={commonCopy.tryAgain}
                  variant="quiet"
                  onPress={() => setVersion((count) => count + 1)}
                />
              )}
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <Button
            label={view.move.label}
            variant={view.move.quiet ? "quiet" : "primary"}
            disabled={view.move.disabled}
            onPress={onMove}
          />
          <Button label={view.addMoney} variant="quiet" onPress={onAddMoney} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.gutter, gap: layout.section },
  hero: { gap: layout.tight, paddingTop: layout.section },
  retry: { gap: layout.tight, alignItems: "flex-start" },
  actions: { gap: layout.tight },
});
