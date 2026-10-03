import { StyleSheet, View } from "react-native";
import { readAsOne } from "./accessibility";
import { Divider } from "./Divider";
import { Panel } from "./Panel";
import { Row } from "./Row";
import { Text } from "./Text";
import { fonts, layout } from "./theme";

type Term = { label: string; value: string };

type TermsProps = {
  terms: readonly Term[];
  /** The last row, after a rule and in the heaviest weight: what leaves or arrives in all. */
  total?: Term & { announcement?: string };
};

/**
 * A review's terms (spec 3.1): label left, value right, one Panel, and the
 * total last after a Divider. Each row is read label then value.
 */
export function Terms({ terms, total }: TermsProps) {
  return (
    <Panel style={styles.panel}>
      {terms.map((term, index) => (
        <Row
          key={term.label}
          label={term.label}
          value={<Text style={styles.value}>{term.value}</Text>}
          last={index === terms.length - 1}
        />
      ))}
      {total && (
        <>
          <Divider />
          <View
            {...readAsOne}
            accessibilityLabel={total.announcement ?? `${total.label}, ${total.value}`}
            style={styles.total}
          >
            <Text style={styles.totalLabel}>{total.label}</Text>
            <Text style={[styles.value, styles.totalValue]}>{total.value}</Text>
          </View>
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { paddingVertical: 0 },
  value: { flexShrink: 0, textAlign: "right", fontVariant: ["tabular-nums"] },
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: layout.group,
    paddingVertical: layout.group,
  },
  totalLabel: { flexShrink: 1, fontFamily: fonts.medium },
  totalValue: { fontFamily: fonts.medium },
});
