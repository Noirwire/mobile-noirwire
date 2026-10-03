import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/ui/theme";

/** Entering and leaving public view. */
export const FADE_MS = 260;

/**
 * A full-screen layer that fades in over what is beneath it, and out again
 * before it unmounts: 260 ms ease-out, or an instant cut when the system asks
 * for reduced motion. It takes no touches while it fades out.
 */
export function FadeLayer({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(visible ? 1 : 0);
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const target = visible ? 1 : 0;
    opacity.value = reduceMotion
      ? target
      : withTiming(target, { duration: FADE_MS, easing: Easing.out(Easing.ease) });
    if (visible) return;
    const timer = setTimeout(() => setMounted(false), reduceMotion ? 0 : FADE_MS);
    return () => clearTimeout(timer);
  }, [visible, reduceMotion, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!mounted) return null;
  return (
    <Animated.View pointerEvents={visible ? "auto" : "none"} style={[styles.cover, fade]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.base },
});
