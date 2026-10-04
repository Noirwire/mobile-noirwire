import { StyleSheet, View } from "react-native";
import { readAsOne } from "./accessibility";
import { FittedFigure } from "./FittedFigure";
import { SignatureArc } from "./SignatureArc";
import { Text } from "./Text";
import { layout, type ColorToken } from "./theme";

type BalanceHeaderProps = {
  /** "Total value". */
  label: string;
  /** The figure, already formatted: "$8,729.89", or "Value unavailable". */
  value: string;
  /** The line under it, already formatted: "+$98.79 (1.2%) held trackers · 24h approximate". */
  change?: string;
  changeTone?: ColorToken;
  /** The figure could not be priced: it is set at body size, never as a display number. */
  unavailable?: boolean;
  /** The arc is a share of something: with a total of zero there is nothing to draw. */
  arc?: boolean;
};

/**
 * Home's balance block: unbordered and type-led, with the signature arc along
 * its trailing edge. The text keeps out of the arc's zone at every length and
 * text size: the figure shrinks to fit, and the other lines wrap. It takes
 * formatted strings only; deciding what they say is the screen's job. A screen
 * reader hears the label, figure and change as one.
 */
export function BalanceHeader({
  label,
  value,
  change,
  changeTone = "dim",
  unavailable = false,
  arc = true,
}: BalanceHeaderProps) {
  const spoken = [label, value, change].filter(Boolean).join(", ");
  return (
    <View style={styles.header}>
      {arc && <SignatureArc />}
      <View {...readAsOne} accessibilityLabel={spoken} style={styles.copy}>
        <Text variant="faint">{label}</Text>
        {unavailable ? <Text>{value}</Text> : <FittedFigure value={value} />}
        {change !== undefined && (
          <Text variant="note" tone={changeTone}>
            {change}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    justifyContent: "center",
    overflow: "hidden",
    paddingTop: layout.section,
    paddingBottom: layout.hero,
    // Cancels the screen's own gutter on the trailing edge only, so the arc
    // reaches the physical screen edge instead of stopping short of it with
    // a hard cut at the gutter. The leading edge, where the text starts,
    // keeps its position. `marginEnd` (not `marginRight`) so this still
    // bleeds off the correct edge under a right-to-left layout.
    marginEnd: -layout.gutter,
  },
  copy: { gap: layout.tight, marginEnd: layout.signature },
});
