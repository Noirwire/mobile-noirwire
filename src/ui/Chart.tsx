import { useId, useState } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { readAsOne } from "./accessibility";
import { chartPaths } from "./chartPath";
import { changeTone } from "./format";
import { colors } from "./theme";

type ChartProps = {
  points: number[];
  height?: number;
  /** Describes the series for a screen reader, since the line itself says nothing. */
  label: string;
};

const PAD = 8;

/** A line with a soft fill beneath it, coloured by whether the series ended above where it began. */
export function Chart({ points, height = 200, label }: ChartProps) {
  const [width, setWidth] = useState(0);
  const fillId = useId();
  const paths = width > 0 ? chartPaths(points, width, height, PAD) : null;
  const stroke = colors[changeTone((points.at(-1) ?? 0) - (points[0] ?? 0))];

  return (
    <View
      {...readAsOne}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ height }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {paths && (
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
      )}
    </View>
  );
}
