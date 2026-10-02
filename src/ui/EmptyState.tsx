import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Mark } from "./Mark";
import { Text } from "./Text";
import { space } from "./theme";

type EmptyStateProps = {
  title: string;
  detail: string;
  /** Usually the one button that gets someone out of the empty state. */
  action?: ReactNode;
};

export function EmptyState({ title, detail, action }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <Mark size={40} tone="line-strong" />
      <Text variant="h2" style={styles.centered}>
        {title}
      </Text>
      <Text tone="dim" style={styles.centered}>
        {detail}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space[3],
    paddingVertical: space[10],
  },
  centered: { textAlign: "center" },
});
