import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, layout } from "./theme";

type ScreenProps = {
  children: ReactNode;
  /** Which edges to keep clear. A screen under a navigation header leaves the top to the header. */
  edges?: readonly Edge[];
};

const ALL_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

export function Screen({ children, edges = ALL_EDGES }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        indicatorStyle="white"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: layout.gutter, gap: layout.section },
});
