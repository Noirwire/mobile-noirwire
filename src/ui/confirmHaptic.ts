import * as Haptics from "expo-haptics";

const ignore = () => undefined;

/** Pressing Confirm on a money review (spec 3.12): a medium impact. */
export function confirmHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore);
}
