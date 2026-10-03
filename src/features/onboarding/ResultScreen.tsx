import { commonCopy, onboardingCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import type { SchemeActivity } from "@noirwire/shared/infrastructure";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Screen, Text } from "@/ui";
import { successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { groupsOfFour, importResultView } from "@noirwire/shared/presentation";

type ResultScreenProps = {
  activity: SchemeActivity;
  /** The funding address of the opened set, shown only when asked for. */
  fundingAddress: string;
  onContinue: () => void;
  onOtherSet: () => void;
};

const copy = mobileOnboardingCopy.result;

/** Spec 2.7: what was found, before a password is set. The address stays hidden until asked for. */
export function ResultScreen({
  activity,
  fundingAddress,
  onContinue,
  onOtherSet,
}: ResultScreenProps) {
  const view = importResultView(activity);
  const [shown, setShown] = useState(false);
  useCaptureProtection(shown);

  useEffect(() => {
    if (view.found) successHaptic();
  }, [view.found]);

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
        <Button label={commonCopy.continue} onPress={onContinue} />
        <Button label={onboardingCopy.import.otherSet} variant="quiet" onPress={onOtherSet} />
        <View style={styles.reveal}>
          <Button
            label={shown ? copy.hideAddress : copy.showAddress}
            variant="quiet"
            onPress={() => setShown((current) => !current)}
          />
        </View>
        {shown && (
          <View accessible accessibilityLabel={`${copy.addressLabel}, ${groups.join(" ")}`}>
            <Text selectable={false}>{groups.join(" ")}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  actions: { gap: layout.tight },
  reveal: { alignSelf: "flex-start" },
});
