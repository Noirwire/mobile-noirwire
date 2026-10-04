import { commonCopy } from "@noirwire/shared/copy";
import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { readAsOne } from "./accessibility";
import { Text } from "./Text";
import { colors, layout, motion, radius, size, type ColorToken } from "./theme";

export type StepStatus = "waiting" | "current" | "done" | "failed" | "skipped";

export type Step = {
  key: string;
  title: string;
  caption?: string;
  status: StepStatus;
  /** Overrides the status word, for example "Placing..." or "Not placed". */
  statusLabel?: string;
  /** Why a failed step failed. */
  reason?: string;
};

const STATUS_WORD: Record<StepStatus, string> = commonCopy.stepStatus;

const STATUS_TONE: Record<StepStatus, ColorToken> = {
  waiting: "faint",
  current: "ink",
  done: "dim",
  failed: "danger",
  skipped: "faint",
};

/** A step changes state with one short fade, only when the evidence changes; none under Reduce Motion. */
const CHANGE = FadeIn.duration(motion.stepMs).easing(Easing.out(Easing.quad));

/**
 * Progress through named steps after Confirm: private funding, a pie's
 * orders. Each step is one element for a screen reader, and a change of state
 * is announced with the step's name ("Waiting in the queue, done").
 */
export function StepList({ steps }: { steps: readonly Step[] }) {
  return (
    <View accessibilityRole="list">
      {steps.map((step, index) => (
        <StepItem key={step.key} step={step} last={index === steps.length - 1} />
      ))}
    </View>
  );
}

function StepItem({ step, last }: { step: Step; last: boolean }) {
  const word = step.statusLabel ?? STATUS_WORD[step.status];
  useAnnounceChange(`${step.title}, ${word}`, step.status);

  return (
    <View {...readAsOne} accessibilityLabel={`${step.title}, ${word}`} style={styles.item}>
      <View style={styles.rail}>
        <Animated.View key={step.status} entering={CHANGE}>
          <StatusMark status={step.status} />
        </Animated.View>
        {!last && <View style={[styles.line, step.status === "done" && styles.lineDone]} />}
      </View>
      <View style={[styles.copy, !last && styles.copySpaced]}>
        <View style={styles.titleRow}>
          <Text style={styles.title} tone={step.status === "waiting" ? "dim" : "ink"}>
            {step.title}
          </Text>
          <Text variant="note" tone={STATUS_TONE[step.status]}>
            {word}
          </Text>
        </View>
        {step.caption !== undefined && <Text variant="faint">{step.caption}</Text>}
        {step.status === "failed" && step.reason !== undefined && (
          <Text variant="note" tone="danger">
            {step.reason}
          </Text>
        )}
      </View>
    </View>
  );
}

function StatusMark({ status }: { status: StepStatus }) {
  if (status === "current")
    return <ActivityIndicator size="small" color={colors.ink} style={styles.mark} />;
  if (status === "done") {
    return (
      <View style={[styles.mark, styles.markDone]}>
        <CheckIcon size={size.checkIcon} weight="bold" color={colors.base} />
      </View>
    );
  }
  if (status === "failed") {
    return (
      <View style={[styles.mark, styles.markFailed]}>
        <XIcon size={size.checkIcon} weight="bold" color={colors.danger} />
      </View>
    );
  }
  return (
    <View style={[styles.mark, styles.markOpen, status === "skipped" && styles.markSkipped]} />
  );
}

/** Announces a step's new state, but not its first one: a list appearing is not a change. */
function useAnnounceChange(message: string, status: StepStatus) {
  const previous = useRef(status);
  useEffect(() => {
    if (previous.current === status) return;
    previous.current = status;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message, status]);
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: layout.inset },
  rail: { alignItems: "center", width: size.statusMark },
  line: {
    flex: 1,
    width: size.stroke,
    marginVertical: layout.hairline,
    backgroundColor: colors.line,
  },
  lineDone: { backgroundColor: colors["line-strong"] },
  mark: {
    width: size.statusMark,
    height: size.statusMark,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  markOpen: { borderWidth: size.checkboxBorder, borderColor: colors["line-strong"] },
  markSkipped: { borderStyle: "dashed", borderColor: colors.line },
  markDone: { backgroundColor: colors.ink },
  markFailed: { borderWidth: size.checkboxBorder, borderColor: colors.danger },
  copy: { flex: 1, gap: layout.hairline },
  copySpaced: { paddingBottom: layout.group },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: layout.tight },
  title: { flex: 1 },
});
