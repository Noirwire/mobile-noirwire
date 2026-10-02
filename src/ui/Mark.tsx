import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { readAsOne } from "./accessibility";
import { RAVEN_PATH, RAVEN_VIEWBOX } from "./brand-geometry";
import { colors, type ColorToken } from "./theme";

type MarkProps = {
  size?: number;
  tone?: ColorToken;
  /** Names the mark for a screen reader. Without it the mark is decoration and is skipped. */
  title?: string;
};

export function Mark({ size = 22, tone = "ink", title }: MarkProps) {
  const decorative = title === undefined;
  return (
    <View
      {...(decorative ? {} : readAsOne)}
      aria-hidden={decorative}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={title}
    >
      <Svg viewBox={RAVEN_VIEWBOX} width={size} height={size}>
        <Path d={RAVEN_PATH} fill={colors[tone]} fillRule="evenodd" />
      </Svg>
    </View>
  );
}
