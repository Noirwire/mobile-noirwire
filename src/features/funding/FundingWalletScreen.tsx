import { fundingWalletView } from "@noirwire/shared/presentation";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Skeleton, Text } from "@/ui";
import { colors, layout } from "@/ui/theme";
import { useServices } from "../services";
import { useMoney } from "../network/money";
import { useWalletSnapshot } from "../network/useWalletSnapshot";

type FundingWalletScreenProps = {
  onMove: () => void;
  onShowAddress: () => void;
};

const CASH = "USDC";

/** Spec 2.31: what is waiting in the funding wallet, and where to send more. Never its address. */
export function FundingWalletScreen({ onMove, onShowAddress }: FundingWalletScreenProps) {
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
    money.refresh
      .funding(address, CASH)
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
            <Skeleton width={180} height={46} />
          ) : (
            <Text variant="display" accessibilityLabel={view.balanceLabel ?? undefined}>
              {view.balance}
            </Text>
          )}
          <Text tone="dim">{view.lead}</Text>
          {view.readFailed && (
            <Text variant="note" tone="warning" accessibilityRole="alert">
              {view.readFailed}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <Button
            label={view.move.label}
            variant={view.move.quiet ? "quiet" : "primary"}
            disabled={view.move.disabled}
            onPress={onMove}
          />
          <Button label={view.showAddress} variant="quiet" onPress={onShowAddress} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  content: { padding: layout.gutter, gap: layout.section },
  hero: { gap: layout.tight, paddingTop: layout.section },
  actions: { gap: layout.tight },
});
