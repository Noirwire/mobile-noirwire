import { commonCopy, onboardingCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import type { SchemeActivity } from "@noirwire/shared/infrastructure";
import { groupsOfFour, importResultView, lookFurtherView } from "@noirwire/shared/presentation";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Screen, Text, useWaiting, WaitingLine } from "@/ui";
import { successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { ProtectionRefused } from "@/ui/ProtectionRefused";
import { useCaptureProtection } from "@/ui/useCaptureProtection";

type ResultScreenProps = {
  activity: SchemeActivity;
  /** The funding address of the opened set, shown only when asked for. */
  fundingAddress: string;
  onContinue: () => void;
  /** Absent when nothing was found under either set of addresses: there was no choice to go back to. */
  onOtherSet?: () => void;
  /** Looks further along the phrase's addresses for a portfolio that is missing. */
  lookFurther: (activity: SchemeActivity) => Promise<SchemeActivity>;
  /** What the further scan answered, when it found more than the first. */
  onFoundMore: (activity: SchemeActivity) => void;
  /** Without the network there is nothing to look with. */
  online: boolean;
};

/** A further scan reads up to a hundred more addresses, so it gets longer than one read. */
export const LOOK_FURTHER_LIMIT_MS = 300_000;

type Looking =
  | { status: "idle" }
  | { status: "looking" }
  | { status: "failed" }
  | { status: "done"; before: SchemeActivity; after: SchemeActivity };

const copy = mobileOnboardingCopy.result;

/**
 * Spec 2.7: what was found, before a password is set. The address stays
 * hidden until asked for. When a portfolio the person expects is not there,
 * "Look further" scans on from where the import stopped; it can be cancelled,
 * and one that cannot finish says so and changes nothing.
 */
export function ResultScreen({
  activity,
  fundingAddress,
  onContinue,
  onOtherSet,
  lookFurther,
  onFoundMore,
  online,
}: ResultScreenProps) {
  const view = importResultView(activity);
  const [asked, setAsked] = useState(false);
  const [looking, setLooking] = useState<Looking>({ status: "idle" });
  const run = useRef(0);
  const active = looking.status === "looking";
  const waiting = useWaiting(active, "action", { limitMs: LOOK_FURTHER_LIMIT_MS });
  const further = lookFurtherView(looking);
  const protection = useCaptureProtection(asked);
  // Drawn only once the system has confirmed the protection, never on the press itself.
  const shown = asked && protection.ready;

  useEffect(() => {
    if (view.found) successHaptic();
  }, [view.found]);

  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  // Going offline, or running past the limit, ends the scan: nothing was changed.
  if (active && (!online || waiting.overdue)) setLooking({ status: "failed" });
  useEffect(() => {
    // An answer that comes after the scan was ended or cancelled is ignored.
    if (!active) run.current += 1;
  }, [active]);

  async function look() {
    const mine = ++run.current;
    setLooking({ status: "looking" });
    try {
      const after = await lookFurther(activity);
      if (run.current !== mine) return;
      setLooking({ status: "done", before: activity, after });
      if (after.portfolios.length > activity.portfolios.length) onFoundMore(after);
    } catch {
      if (run.current === mine) setLooking({ status: "failed" });
    }
  }

  function cancel() {
    setLooking({ status: "idle" });
  }

  const groups = groupsOfFour(fundingAddress);
  return (
    <Screen edges={["right", "bottom", "left"]}>
      <View style={styles.intro}>
        <Text variant="display" accessibilityRole="header">
          {view.title}
        </Text>
        <Text tone="dim">{view.body}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={commonCopy.continue}
          disabled={further.continuePaused !== null}
          onPress={onContinue}
        />
        {further.continuePaused !== null && (
          <Text variant="faint" accessibilityLiveRegion="polite">
            {further.continuePaused}
          </Text>
        )}
        {onOtherSet && (
          <Button
            label={onboardingCopy.import.otherSet}
            variant="quiet"
            disabled={active}
            onPress={onOtherSet}
          />
        )}
        <View style={styles.reveal}>
          <Button
            label={asked ? copy.hideAddress : copy.showAddress}
            variant="quiet"
            onPress={() => setAsked((current) => !current)}
          />
        </View>
        <ProtectionRefused protection={protection} />
        {shown && (
          <View accessible accessibilityLabel={`${copy.addressLabel}, ${groups.join(" ")}`}>
            <Text selectable={false}>{groups.join(" ")}</Text>
          </View>
        )}
      </View>
      <View style={styles.further}>
        {further.note && (
          <Text
            variant="note"
            tone={further.note.tone}
            accessibilityRole={further.note.tone === "danger" ? "alert" : undefined}
            accessibilityLiveRegion="polite"
          >
            {further.note.text}
          </Text>
        )}
        {further.waiting !== null && (
          <>
            <WaitingLine waiting={{ ...waiting, label: further.waiting }} />
            <Button label={commonCopy.cancel} variant="quiet" onPress={cancel} />
          </>
        )}
        {further.action !== null && (
          <Button
            label={further.action}
            variant="quiet"
            disabled={!online}
            onPress={() => void look()}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  actions: { gap: layout.tight },
  reveal: { alignSelf: "flex-start" },
  further: { gap: layout.tight, alignItems: "flex-start" },
});
