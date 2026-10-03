import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, layout } from "./theme";

type RefreshScreenProps = {
  children: ReactNode;
  /** True while a pull to refresh is being answered. */
  refreshing: boolean;
  onRefresh: () => void;
  /** Which edges to keep clear. A screen under a navigation header leaves the top to the header. */
  edges?: readonly Edge[];
  /** Drawn above the scrolling content, full width: a portfolio's identity line. */
  top?: ReactNode;
  /** Held below the scrolling content, inside the gutter: a pinned primary action. */
  footer?: ReactNode;
};

const ALL_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

/** A Screen that refreshes on a pull down, with an optional line along its top and a pinned footer. */
export function RefreshScreen({
  children,
  refreshing,
  onRefresh,
  edges = ALL_EDGES,
  top,
  footer,
}: RefreshScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {top}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        indicatorStyle="white"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.dim}
            colors={[colors.ink]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {children}
      </ScrollView>
      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: layout.gutter, gap: layout.section },
  footer: { paddingHorizontal: layout.gutter, paddingVertical: layout.tight },
});
