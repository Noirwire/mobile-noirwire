import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";
import { readAsOne } from "./accessibility";
import { ringGeometry, targetTicks, TICK_ROOM } from "./pieGeometry";
import { colors, layout } from "./theme";

type PieRingProps = {
  /** Each slice's target weight in percent, in row order. */
  target: readonly number[];
  /**
   * Each slice's current weight, in the same order. Omitted, the ring shows the
   * target (the pie builder). All zero, the target is drawn as outlines: the
   * mix is set and nothing is invested yet.
   */
  current?: readonly number[];
  /** The ring is a picture; this is its whole text alternative, centre label and each slice. */
  label: string;
  size?: number;
  thickness?: number;
  /** The centre label, such as "Invested" over a value. */
  children?: ReactNode;
};

const TICK_WIDTH = 1.5;
/** An outlined slice is drawn at a third of the ring's thickness. */
const OUTLINE_SHARE = 1 / 3;

/** A ring divided by weight. Against a current mix, ticks outside it mark where each target slice begins. */
export function PieRing({
  target,
  current,
  label,
  size = 160,
  thickness = 12,
  children,
}: PieRingProps) {
  const invested = current !== undefined && current.some((part) => part > 0);
  const outlined = current !== undefined && !invested;
  const ticks = invested ? targetTicks(target, size, thickness) : [];
  const ring = ringGeometry(invested ? current : target, size, thickness, invested ? TICK_ROOM : 0);
  const { centre, radius, circumference } = ring;

  return (
    <View
      {...readAsOne}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`rotate(-90 ${centre} ${centre})`}>
          <Circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke={colors["line-subtle"]}
            strokeWidth={thickness}
          />
          {ring.slices.map((slice, index) => (
            <Circle
              key={index}
              cx={centre}
              cy={centre}
              r={radius}
              fill="none"
              stroke={outlined ? colors["line-strong"] : colors.ink}
              strokeOpacity={outlined ? 1 : slice.tone}
              strokeWidth={outlined ? thickness * OUTLINE_SHARE : thickness}
              strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
              strokeDashoffset={-slice.start}
            />
          ))}
        </G>
        {ticks.map((tick, index) => (
          <Line
            key={index}
            {...tick}
            stroke={colors["ink-strong"]}
            strokeWidth={TICK_WIDTH}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      {children !== undefined && (
        <View aria-hidden style={styles.centre}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.group,
  },
});
