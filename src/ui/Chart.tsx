import { chartPaths } from "@noirwire/shared/design";
import { useEffect, useId, useMemo, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, type AccessibilityActionEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { readAsOne } from "./accessibility";
import { changeColor } from "./changeColor";
import { Text } from "./Text";
import { colors, layout, size } from "./theme";

/** What a held point reads: its price and its date, already formatted. */
export type ChartReading = { price: string; date: string };

type ChartProps = {
  points: number[];
  height?: number;
  /** Describes the series for a screen reader, since the line itself says nothing. */
  label: string;
  /**
   * Given, the chart answers a press and hold: the point under the finger is
   * marked and read out above the line. `x` runs from 0 at the left edge to 1
   * at the right.
   */
  readout?: (x: number) => ChartReading | null;
};

const PAD = 8;
/** How long a finger rests before the chart takes the touch from the scroll around it. */
export const CHART_HOLD_MS = 250;
export const CHART_HOLD_TEST_ID = "chart-hold";
/** How many steps a screen reader's swipe takes across the series. */
const READER_STEPS = 12;

/** A line with a soft fill beneath it, coloured by whether the series ended above where it began. */
export function Chart({ points, height = 200, label, readout }: ChartProps) {
  const [width, setWidth] = useState(0);
  const fillId = useId();
  const paths = width > 0 ? chartPaths(points, width, height, PAD) : null;
  const stroke = colors[changeColor((points.at(-1) ?? 0) - (points[0] ?? 0))];

  const line = paths && (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={0.22} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={paths.area} fill={`url(#${fillId})`} />
      <Path
        d={paths.line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
  const measure = (event: { nativeEvent: { layout: { width: number } } }) =>
    setWidth(event.nativeEvent.layout.width);

  if (readout && points.length > 1) {
    return (
      <HeldChart
        last={points.length - 1}
        width={width}
        height={height}
        label={label}
        readout={readout}
        onLayout={measure}
      >
        {line}
      </HeldChart>
    );
  }
  return (
    <View
      {...readAsOne}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ height }}
      onLayout={measure}
    >
      {line}
    </View>
  );
}

/** The point being read, and whether a finger or a screen reader chose it. */
type Held = { index: number; by: "touch" | "reader" };

type HeldChartProps = {
  /** The index of the series' last point. */
  last: number;
  width: number;
  height: number;
  label: string;
  readout: (x: number) => ChartReading | null;
  onLayout: (event: { nativeEvent: { layout: { width: number } } }) => void;
  children: React.ReactNode;
};

/**
 * The chart with its press-and-hold readout. A finger held on the line marks
 * the nearest point and its price and date show above; the reading is spoken
 * as it changes. A screen reader, which cannot hold and drag, steps through
 * the same points with its adjust gesture.
 */
function HeldChart({ last, width, height, label, readout, onLayout, children }: HeldChartProps) {
  const [held, setHeld] = useState<Held | null>(null);
  const cursor = useSharedValue(0);
  const step = width > 0 ? (width - PAD * 2) / last : 0;
  const reading = held === null ? null : readout(held.index / last);
  const spoken = reading ? `${reading.price}, ${reading.date}` : null;

  // A screen reader says its own adjustment; a point held by touch is said here.
  const touched = held?.by === "touch" ? spoken : null;
  useEffect(() => {
    if (touched) AccessibilityInfo.announceForAccessibility(touched);
  }, [touched]);

  const gesture = useMemo(() => {
    const hold = (index: number | null) =>
      setHeld((current) =>
        index === null
          ? null
          : current?.index === index && current.by === "touch"
            ? current
            : { index, by: "touch" },
      );
    const follow = (x: number) => {
      "worklet";
      if (step <= 0) return;
      const index = Math.min(Math.max(Math.round((x - PAD) / step), 0), last);
      cursor.set(PAD + index * step);
      scheduleOnRN(hold, index);
    };
    return Gesture.Pan()
      .withTestId(CHART_HOLD_TEST_ID)
      .activateAfterLongPress(CHART_HOLD_MS)
      .onStart((event) => follow(event.x))
      .onUpdate((event) => follow(event.x))
      .onFinalize(() => scheduleOnRN(hold, null));
  }, [cursor, last, step]);

  function adjust(event: AccessibilityActionEvent) {
    const stride = Math.max(1, Math.round(last / READER_STEPS));
    const from = held?.index ?? last;
    const forward = event.nativeEvent.actionName === "increment";
    const index = Math.min(Math.max(from + (forward ? stride : -stride), 0), last);
    cursor.set(PAD + index * step);
    setHeld({ index, by: "reader" });
  }

  const cursorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cursor.get() }] }));

  return (
    <View style={styles.held}>
      <View style={styles.reading} aria-hidden={reading === null}>
        {reading && (
          <>
            <Text style={styles.figure}>{reading.price}</Text>
            <Text variant="faint">{reading.date}</Text>
          </>
        )}
      </View>
      <GestureDetector gesture={gesture}>
        <View
          {...readAsOne}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          aria-valuetext={spoken ?? undefined}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={adjust}
          style={{ height }}
          onLayout={onLayout}
        >
          {children}
          {held !== null && (
            <Animated.View style={[styles.cursor, { height }, cursorStyle]} pointerEvents="none" />
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  held: { gap: layout.hairline },
  reading: { minHeight: 22, flexDirection: "row", alignItems: "baseline", gap: layout.tight },
  figure: { fontVariant: ["tabular-nums"] },
  cursor: {
    position: "absolute",
    left: 0,
    top: 0,
    width: size.stroke,
    backgroundColor: colors["line-strong"],
  },
});
