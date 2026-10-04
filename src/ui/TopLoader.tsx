import { useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { readAsOne } from "./accessibility";
import { colors, motion } from "./theme";
import { topLoaderStore } from "./topLoaderStore";
import { useReducedMotion } from "./useReducedMotion";
import { useWaiting } from "./useWaiting";

const BAR_HEIGHT = 2;
const LIGHT_WIDTH_RATIO = 0.3;
const SWEEP_MS = 1100;
const PULSE_MS = 1200;

type TopLoaderProps = {
  /**
   * Pinned to this sheet's own top edge instead of the device's status bar.
   * A sheet is its own window, so the root bar underneath it is covered; the
   * sheet carries one of its own at its top edge, reading the same signal.
   */
  embedded?: boolean;
};

/**
 * The app's one waiting signal: a thin light sliding under the status bar
 * (or, inside a sheet, under its grabber). It is the single visual language
 * for every wait in the app, mounted once and switched on by `useTopLoader`
 * from wherever a screen or sheet is waiting on something. It fades in only
 * once a wait has run past the waiting standard's own delay, and fades out
 * the moment none are left, so a fast answer never flashes it. Reduced
 * motion holds it to a gentle pulse instead of a sliding light. Decoration:
 * a screen reader hears it once as busy, not on every frame.
 */
export function TopLoader({ embedded = false }: TopLoaderProps) {
  const count = useSyncExternalStore(
    topLoaderStore.subscribe,
    topLoaderStore.getSnapshot,
    topLoaderStore.getSnapshot,
  );
  // Reuses the waiting standard's own 300 ms delay so the bar never flashes
  // for a wait that was about to end anyway.
  const waiting = useWaiting(count > 0, "content");
  const visible = waiting.signal !== "none";
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  const appear = useSharedValue(0);
  useEffect(() => {
    appear.set(
      withTiming(visible ? 1 : 0, { duration: motion.overlayMs, easing: Easing.out(Easing.ease) }),
    );
  }, [visible, appear]);
  const appearStyle = useAnimatedStyle(() => ({ opacity: appear.get() }));

  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!visible || reduceMotion) return;
    sweep.set(0);
    sweep.set(
      withRepeat(
        withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [visible, reduceMotion, sweep]);
  const lightWidth = width * LIGHT_WIDTH_RATIO;
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.get() * (width + lightWidth) - lightWidth }],
  }));

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!visible || !reduceMotion) return;
    pulse.set(
      withRepeat(
        withTiming(0.4, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [visible, reduceMotion, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <View
      {...(visible ? readAsOne : {})}
      testID="top-loader"
      pointerEvents="none"
      accessibilityRole={visible ? "progressbar" : undefined}
      accessibilityLabel={visible ? (waiting.label ?? undefined) : undefined}
      accessibilityState={{ busy: visible }}
      accessibilityLiveRegion="polite"
      style={[styles.container, { top: embedded ? 0 : insets.top }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View testID="top-loader-track" style={[styles.track, appearStyle]}>
        {reduceMotion ? (
          <Animated.View testID="top-loader-fill" style={[styles.fill, pulseStyle]} />
        ) : (
          <Animated.View
            testID="top-loader-light"
            style={[styles.light, { width: lightWidth }, sweepStyle]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    zIndex: 1000,
    elevation: 1000,
  },
  track: { flex: 1, overflow: "hidden", backgroundColor: colors["line-subtle"] },
  fill: { flex: 1, backgroundColor: colors["ink-strong"] },
  light: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors["ink-strong"],
  },
});
