import { symbolAmount, usd } from "@noirwire/shared/domain";
import { Text, type TextProps } from "./Text";

type MoneyProps = Omit<TextProps, "children"> & {
  amount: number;
  /** Omit for a dollar value; pass a token symbol for an amount held in that token. */
  symbol?: string;
};

export function Money({ amount, symbol, style, ...rest }: MoneyProps) {
  return (
    <Text {...rest} style={[{ fontVariant: ["tabular-nums"] }, style]}>
      {symbol === undefined ? usd(amount) : symbolAmount(symbol, amount)}
    </Text>
  );
}
