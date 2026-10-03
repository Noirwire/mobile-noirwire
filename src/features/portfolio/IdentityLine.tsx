import type { PortfolioIconTint } from "@noirwire/shared/domain";
import { StyleSheet, View } from "react-native";
import { colors } from "@/ui/theme";

const LINE = 3;
/** The neutral tint draws the line in ink at 40 percent. */
const NEUTRAL_OPACITY = 0.4;

/**
 * The 3pt line in a portfolio's tint that says which portfolio a screen or
 * sheet acts for. Decoration: the name in the header carries the same thing.
 */
export function IdentityLine({ tint }: { tint: PortfolioIconTint }) {
  return (
    <View
      aria-hidden
      style={[
        styles.line,
        {
          backgroundColor: colors[`portfolio-${tint}`],
          opacity: tint === "neutral" ? NEUTRAL_OPACITY : 1,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: LINE, alignSelf: "stretch" },
});
