import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { readAsOne } from "./accessibility";
import { Text } from "./Text";
import { colors, layout } from "./theme";
import type { Waiting } from "./useWaiting";

type WaitingPlaceholderProps = {
  waiting: Waiting;
  /** The quiet shapes that hold the content's place: Skeletons. */
  children: ReactNode;
};

/**
 * Content that is still loading. The shapes keep their place from the start,
 * so nothing jumps, and are drawn only once the wait has lasted long enough
 * to be worth showing. "Loading" is announced, never shown; the calm line
 * appears under the shapes when the wait runs long.
 */
export function WaitingPlaceholder({ waiting, children }: WaitingPlaceholderProps) {
  const shown = waiting.signal !== "none";
  return (
    <View
      {...(shown ? readAsOne : {})}
      accessibilityRole={shown ? "progressbar" : undefined}
      accessibilityLabel={waiting.label ?? undefined}
      accessibilityLiveRegion="polite"
      style={[styles.placeholder, !shown && styles.unseen]}
    >
      {children}
      {waiting.stillWorking !== null && <Text variant="faint">{waiting.stillWorking}</Text>}
    </View>
  );
}

/**
 * A quiet inline indicator: a small moving mark beside the label, and the
 * "still working" line under it once the wait runs long. Nothing at all for
 * the first moment of a wait.
 */
export function WaitingLine({ waiting }: { waiting: Waiting }) {
  if (waiting.signal === "none") return null;
  return (
    <View style={styles.line} accessibilityLiveRegion="polite">
      <View style={styles.indicator}>
        <ActivityIndicator size="small" color={colors.dim} />
        <Text variant="note">{waiting.label}</Text>
      </View>
      {waiting.stillWorking !== null && <Text variant="faint">{waiting.stillWorking}</Text>}
    </View>
  );
}

/** The calm line alone, under a control that already shows its own indicator. */
export function StillWorking({ waiting }: { waiting: Waiting }) {
  if (waiting.stillWorking === null) return null;
  return (
    <Text variant="faint" accessibilityLiveRegion="polite">
      {waiting.stillWorking}
    </Text>
  );
}

const styles = StyleSheet.create({
  placeholder: { gap: layout.inset },
  unseen: { opacity: 0 },
  line: { gap: layout.hairline },
  indicator: { flexDirection: "row", alignItems: "center", gap: layout.tight },
});
