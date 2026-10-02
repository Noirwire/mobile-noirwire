import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { fitScale } from "./fitScale";
import { Text } from "./Text";
import { textStyles } from "./typography";

/** A display figure shrinks to fit one line, down to this share of its size. */
export const MIN_FIGURE_SCALE = 0.6;
/** Wide enough that the measuring copy is never wrapped or squeezed. */
const MEASURING_WIDTH = 4000;
/** Left over when fitting, so sub-pixel rounding never tips a fitted figure into an ellipsis. */
const FIT_SLACK = 2;

const DISPLAY = textStyles.display;

/**
 * A display number on one line that shrinks to fit its column. The figure is
 * measured from an invisible, unconstrained copy, so it fits the same way on
 * every platform and at every text size, and it never runs past its column.
 */
export function FittedFigure({ value }: { value: string }) {
  const [available, setAvailable] = useState(0);
  const [natural, setNatural] = useState(0);
  const scale = fitScale(available - FIT_SLACK, natural, MIN_FIGURE_SCALE);
  const fitted = {
    fontSize: (DISPLAY.fontSize ?? 0) * scale,
    lineHeight: (DISPLAY.lineHeight ?? 0) * scale,
    letterSpacing: (DISPLAY.letterSpacing ?? 0) * scale,
  };

  return (
    <View onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}>
      <Text variant="display" numberOfLines={1} style={fitted}>
        {value}
      </Text>
      <View aria-hidden style={styles.measure}>
        <Text
          variant="display"
          style={styles.natural}
          onLayout={(event) => setNatural(event.nativeEvent.layout.width)}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  measure: {
    position: "absolute",
    top: 0,
    left: 0,
    width: MEASURING_WIDTH,
    flexDirection: "row",
    alignItems: "flex-start",
    opacity: 0,
    pointerEvents: "none",
  },
  natural: { flexShrink: 0 },
});
