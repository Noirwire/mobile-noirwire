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
