import { portfolioCopy } from "@noirwire/shared/copy";
import {
  PORTFOLIO_ICON_GLYPHS,
  PORTFOLIO_ICON_TINTS,
  type PortfolioIcon,
} from "@noirwire/shared/domain";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, IdentityMark, Text } from "@/ui";
import { selectionHaptic } from "@/ui/haptics";
import { IDENTITY_GLYPHS } from "@/ui/identityGlyphs";
import { colors, layout, radius, size } from "@/ui/theme";
import { mobilePortfolioCopy } from "./copy";

const copy = mobilePortfolioCopy.icon;

type IconPickerProps = {
  value: PortfolioIcon;
  onChange: (icon: PortfolioIcon) => void;
  /** Drawn in place of the mark while no glyph has been chosen: a new pie's ring. */
  leading?: ReactNode;
  /** Offered once a glyph has been chosen for a pie: "Use the pie ring". */
  reset?: { label: string; onPress: () => void };
};

/**
 * "Icon and colour": the current mark with Change, which opens a grid of the
 * 32 glyphs and a row of the eight tints. Each is one radio group.
 */
export function IconPicker({ value, onChange, leading, reset }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  function choose(next: PortfolioIcon) {
    selectionHaptic();
    onChange(next);
  }

  return (
    <View style={styles.picker}>
      <View style={styles.row}>
        {leading ?? <IdentityMark glyph={value.glyph} tint={value.tint} />}
        <Text style={styles.label}>{copy.label}</Text>
        <Button
          variant="quiet"
          label={open ? copy.done : copy.change}
          accessibilityLabel={open ? copy.done : `${copy.change} ${copy.label}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={styles.compact}
        />
      </View>
      {reset && (
        <Button variant="quiet" label={reset.label} onPress={reset.onPress} style={styles.reset} />
      )}
      {open && (
        <>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.glyphGroup}
            style={styles.grid}
          >
            {PORTFOLIO_ICON_GLYPHS.map((glyph) => {
              const Glyph = IDENTITY_GLYPHS[glyph];
              const selected = glyph === value.glyph;
              return (
                <Pressable
                  key={glyph}
                  accessibilityRole="radio"
                  accessibilityLabel={portfolioCopy.icon.glyphOption(
                    portfolioCopy.icon.glyphs[glyph],
                  )}
                  accessibilityState={{ checked: selected }}
                  onPress={() => choose({ ...value, glyph })}
                  style={[styles.cell, selected && styles.selected]}
                >
                  <Glyph
                    size={size.icon}
                    color={selected ? colors[`portfolio-${value.tint}`] : colors.dim}
                  />
                </Pressable>
              );
            })}
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.tintGroup}
            style={styles.tints}
          >
            {PORTFOLIO_ICON_TINTS.map((tint) => {
              const selected = tint === value.tint;
              return (
                <Pressable
                  key={tint}
                  accessibilityRole="radio"
                  accessibilityLabel={copy.tintOption(portfolioCopy.icon.tints[tint])}
                  accessibilityState={{ checked: selected }}
                  onPress={() => choose({ ...value, tint })}
                  style={[styles.tintCell, selected && styles.selected]}
                >
                  <View style={[styles.swatch, { backgroundColor: colors[`portfolio-${tint}`] }]} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const CELL = size.minTarget;
const GLYPHS_PER_ROW = 6;

const styles = StyleSheet.create({
  picker: { gap: layout.group },
  row: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  label: { flex: 1 },
  reset: { alignSelf: "flex-start", minHeight: size.minTarget, paddingHorizontal: 0 },
  compact: { minHeight: size.minTarget, paddingHorizontal: layout.inset },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: layout.tight },
  cell: {
    width: `${100 / GLYPHS_PER_ROW}%`,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selected: { borderColor: colors["line-strong"], backgroundColor: colors.elevated },
  tints: { flexDirection: "row", justifyContent: "space-between" },
  tintCell: {
    width: CELL - 6,
    height: CELL - 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  swatch: { width: 20, height: 20, borderRadius: radius.pill },
});
