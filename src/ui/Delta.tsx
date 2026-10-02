import { changeTone, deltaText } from "./format";
import { Text, type TextProps } from "./Text";

type DeltaProps = Omit<TextProps, "children" | "tone"> & {
  percent: number;
  gain?: number;
};

/** The signed gain and percent pair every value surface renders. */
export function Delta({ percent, gain, style, ...rest }: DeltaProps) {
  return (
    <Text
      {...rest}
      tone={changeTone(gain ?? percent)}
      style={[{ fontVariant: ["tabular-nums"] }, style]}
    >
      {deltaText(percent, gain)}
    </Text>
  );
}
