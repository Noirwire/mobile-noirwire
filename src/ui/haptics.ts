import * as Haptics from "expo-haptics";

// A device with no haptic engine rejects; the action the haptic accompanies must still go through.
const ignore = () => undefined;

/** A choice made from a set: a segment, a chip, a switch, a Stepper press. */
export function selectionHaptic() {
  Haptics.selectionAsync().catch(ignore);
}

/** Pressing the one primary action. */
export function lightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
}

/** Pressing a confirming action, such as Delete this wallet. */
export function heavyHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(ignore);
}

/** A landed result: a wallet saved, an unlock, a quiz passed. */
export function successHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
}

/** A caution: opening Reset. */
export function warningHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignore);
}

/** A refusal: a wrong password, a wrong quiz pick, a failed check. */
export function errorHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignore);
}
