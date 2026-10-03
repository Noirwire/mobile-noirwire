import * as Haptics from "expo-haptics";

/** Entering public view by holding the portfolio's mark. A device with no haptic engine rejects; that is ignored. */
export function mediumHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}
