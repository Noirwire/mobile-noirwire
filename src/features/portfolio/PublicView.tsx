import type { Portfolio, Wallet } from "@noirwire/shared/domain";
import { StyleSheet, View } from "react-native";
import { Button, Notice, Panel, Text } from "@/ui";
import { colors, layout } from "@/ui/theme";
import { AddressReveal } from "../receive/AddressReveal";
import { mobilePortfolioCopy } from "./copy";
import { noteAddressCopied } from "./portfolioActions";
import { publicViewModel } from "./portfolioView";

const copy = mobilePortfolioCopy.publicView;

/**
 * What someone with this portfolio's address can see, as far as this phone
 * knows. Built only from what the phone already holds; nothing is fetched to
 * draw it. The address stays hidden until "Show".
 */
export function PublicView({ portfolio, wallet }: { portfolio: Portfolio; wallet: Wallet }) {
  const model = publicViewModel(portfolio, wallet);
  return (
    <View style={styles.view}>
      <View style={styles.group}>
        <Text variant="faint">{copy.eyebrow}</Text>
        <Text>{copy.lead}</Text>
      </View>

      <AddressReveal
        address={model.address}
        onCopied={() => noteAddressCopied("portfolio")}
        copy={{
          label: copy.address,
          hidden: copy.hidden,
          show: copy.show,
          hide: copy.hide,
          copy: copy.copy,
          copied: copy.copied,
          showLabel: copy.showAddress,
          hideLabel: copy.hideAddress,
          copyLabel: copy.copyAddress,
        }}
      />

      <View style={styles.group}>
        <Text variant="h2">{copy.holdings}</Text>
        {model.holdings.length === 0 ? (
          <Text variant="faint">{copy.noHoldings}</Text>
        ) : (
          model.holdings.map((holding) => (
            <Text key={holding.key} style={styles.line}>
              {holding.text}
            </Text>
          ))
        )}
      </View>

      <View style={styles.group}>
        <Text variant="h2">{copy.transactions}</Text>
        <Text variant="faint">{copy.notFullHistory}</Text>
        {model.transactions.length === 0 ? (
          <Text variant="faint">{copy.noTransactions}</Text>
        ) : (
          model.transactions.map((entry) => (
            <View
              key={entry.id}
              accessible
              accessibilityLabel={`${entry.kind}, ${entry.amount}, ${entry.date}`}
              style={styles.transaction}
            >
              <View style={styles.flex}>
                <Text>{entry.kind}</Text>
                <Text variant="faint">{entry.date}</Text>
              </View>
              <Text style={styles.figure}>{entry.amount}</Text>
            </View>
          ))
        )}
      </View>

      <Panel style={styles.group}>
        <Text>{copy.notOnChainTitle}</Text>
        {copy.notOnChain.map((item) => (
          <Text key={item} variant="note">
            {item}
          </Text>
        ))}
      </Panel>
      <Text variant="faint">{copy.relayed}</Text>
      <Text variant="faint">{copy.relayer}</Text>
      <Notice tone="warning">{copy.clue}</Notice>
    </View>
  );
}

/** The one way back, pinned at the bottom of public view. */
export function PublicViewExit({ onExit }: { onExit: () => void }) {
  return <Button label={copy.back} onPress={onExit} />;
}

const styles = StyleSheet.create({
  view: { gap: layout.section },
  group: { gap: layout.tight },
  line: { fontVariant: ["tabular-nums"] },
  transaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.group,
    paddingVertical: layout.tight,
    borderBottomWidth: 1,
    borderBottomColor: colors["line-subtle"],
  },
  flex: { flex: 1 },
  figure: { fontVariant: ["tabular-nums"], textAlign: "right" },
});
