import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, layout, size } from "./theme";

type ScreenProps = {
  children: ReactNode;
  /** Which edges to keep clear. A screen under a navigation header leaves the top to the header. */
  edges?: readonly Edge[];
};

const ALL_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

/**
 * Kept clear between the field being typed in and the keyboard: room for the
 * line under the field and for the screen's primary button, so neither a
 * field nor the button it leads to is ever under the keyboard.
 */
export const KEYBOARD_CLEARANCE = layout.section + size.control + layout.section;

/**
 * A scrolling screen. While the keyboard is up the content gains room at its
 * end and scrolls to keep the focused field, and the button after it, above
 * the keyboard.
 */
export function Screen({ children, edges = ALL_EDGES }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAwareScrollView
        bottomOffset={KEYBOARD_CLEARANCE}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        indicatorStyle="white"
      >
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: layout.gutter, gap: layout.section },
});
