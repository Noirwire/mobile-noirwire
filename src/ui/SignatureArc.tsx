import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { signatureArc } from "./signatureGeometry";
import { colors, motion } from "./theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STROKE_WIDTH = 1;

export const SIGNATURE_ARC_TEST_ID = "signature-arc";

/**
 * The quiet arc along the trailing edge of Home's balance, in the zone the
 * text never enters. On first reveal it closes its last twenty degrees, once,
 * then holds still; under Reduce Motion it is simply there. It is decoration
 * and is skipped by a screen reader.
 */
export function SignatureArc() {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const reduceMotion = useReducedMotion();
  const arc = signatureArc(box.width, box.height);
  const closing = arc?.closingLength;
  /** How much of the ring's end is still undrawn; the whole ring until the box is measured. */
  const hidden = useSharedValue<number | null>(null);

  useEffect(() => {
    if (closing === undefined || hidden.get() !== null) return;
    if (reduceMotion) {
      hidden.set(0);
      return;
    }
    hidden.set(closing);
    hidden.set(withTiming(0, { duration: motion.signatureMs, easing: Easing.out(Easing.cubic) }));
  }, [closing, hidden, reduceMotion]);

  const length = arc?.length ?? 0;
  const drawn = useAnimatedProps(() => ({ strokeDashoffset: hidden.get() ?? length }));

  return (
    <View
      aria-hidden
      testID={SIGNATURE_ARC_TEST_ID}
      style={styles.layer}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
    >
      {arc && (
        <Svg width={box.width} height={box.height}>
          <AnimatedPath
            d={arc.d}
            fill="none"
            stroke={colors.faint}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${arc.length} ${arc.length}`}
            animatedProps={drawn}
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
});
