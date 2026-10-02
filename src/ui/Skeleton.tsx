import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "./theme";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
};

const BREATH_MS = 1200;

/**
 * Holds the place of a value that is still loading. It breathes rather than
 * shimmers, and holds still when the system asks for reduced motion (the
 * animation library's default for every animation here).
 */
export function Skeleton({ width = "100%", height = 16 }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.45, { duration: BREATH_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const breathing = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      aria-hidden
      style={[
        { width, height, borderRadius: radius.tile, backgroundColor: colors["surface-strong"] },
        breathing,
      ]}
    />
  );
}
