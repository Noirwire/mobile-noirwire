import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { readAsOne } from "./accessibility";
import { Text } from "./Text";
import { colors, layout } from "./theme";

type RowProps = {
  label: string;
  /** A string is set in the row's own type; anything else (Money, Delta) is rendered as given. */
  value: ReactNode;
  /** The last row of a table carries no rule beneath it. */
  last?: boolean;
};

/** One label and value line of a review table. */
export function Row({ label, value, last = false }: RowProps) {
  return (
    <View style={[styles.row, !last && styles.ruled]} {...readAsOne}>
      <Text tone="dim">{label}</Text>
      {typeof value === "string" ? <Text style={styles.value}>{value}</Text> : value}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: layout.group,
    paddingVertical: layout.group,
  },
  ruled: { borderBottomWidth: 1, borderBottomColor: colors["line-subtle"] },
  value: { flexShrink: 1, textAlign: "right" },
});
