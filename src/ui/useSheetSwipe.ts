import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { motion } from "./theme";

/** How far, or how fast, a sheet has to be pulled down to count as a dismissal. */
export const DISMISS_DISTANCE = 120;
export const DISMISS_VELOCITY = 1000;
/** Movement before the pull takes over, so a tap on the header still lands. */
const SWIPE_SLOP = 8;

type SheetSwipe = {
  /** Nothing typed and nothing in flight: the sheet may leave at once. */
  closable: boolean;
  /** An action is in flight: the sheet does not move at all. */
  locked: boolean;
  onDismiss: () => void;
  /** A pull that would dismiss a sheet holding input asks first. */
  onDismissRequest: () => void;
};

/** Pulling a sheet down by its header: it follows the finger, then leaves or springs back. */
export function useSheetSwipe({ closable, locked, onDismiss, onDismissRequest }: SheetSwipe) {
  const offset = useSharedValue(0);
  const height = useSharedValue(0);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!locked)
        .activeOffsetY(SWIPE_SLOP)
        .onUpdate((event) => {
          offset.set(Math.max(event.translationY, 0));
        })
        .onEnd((event) => {
          const dismissing =
            event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
          if (dismissing && closable) {
            offset.set(
              withTiming(height.get(), { duration: motion.overlayMs }, (done) => {
                if (done) scheduleOnRN(onDismiss);
              }),
            );
            return;
          }
          offset.set(withSpring(0));
          if (dismissing) scheduleOnRN(onDismissRequest);
        }),
    [closable, locked, onDismiss, onDismissRequest, offset, height],
  );

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return {
    gesture,
    style,
    onLayout: (layoutHeight: number) => {
      height.set(layoutHeight);
    },
  };
}
