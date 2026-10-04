import type { PortfolioIcon } from "@noirwire/shared/domain";
import { searchMarkets } from "@noirwire/shared/wallet";
import { marketsCopy, mobileSettingsCopy } from "@noirwire/shared/copy";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Field, IdentityMark, Text } from "@/ui";
import { colors, fonts, layout, opacity } from "@/ui/theme";
import { TrackerMark } from "@/ui/TrackerMark";
import { textStyles } from "@/ui/typography";

/** The 3pt line in the acting portfolio's tint; the neutral tint draws it in ink at 40 percent. */
export function IdentityLine({ tint }: { tint: PortfolioIcon["tint"] }) {
  return (
    <View
      aria-hidden
      style={[
        styles.line,
        { backgroundColor: colors[`portfolio-${tint}`] },
        tint === "neutral" && styles.neutral,
      ]}
    />
  );
}

/** Which portfolio acts, and for which tracker: the header every step after the first carries. */
export function ActingHeader({
  portfolio,
  tracker,
}: {
  portfolio: { label: string; icon: PortfolioIcon } | null;
  tracker: { symbol: string; name: string; caption: string } | null;
}) {
  return (
    <View style={styles.acting}>
      {portfolio && (
        <View style={styles.inline}>
          <IdentityMark glyph={portfolio.icon.glyph} tint={portfolio.icon.tint} size="sm" />
          <Text style={styles.medium}>{portfolio.label}</Text>
        </View>
      )}
      {tracker && (
        <View style={styles.inline}>
          <TrackerMark symbol={tracker.symbol} size="sm" />
          <View>
            <Text>{tracker.name}</Text>
            <Text variant="faint">{tracker.caption}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const CHOOSER_ROWS = 6;

/** Choosing a tracker inside a sheet: a search, up to six rows, and how many more there are. */
export function TrackerChooser({
  label,
  exclude = [],
  onChoose,
}: {
  label: string;
  exclude?: readonly string[];
  onChoose: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const found = searchMarkets(query).filter((entry) => !exclude.includes(entry.symbol));
  const rows = found.slice(0, CHOOSER_ROWS);
  const hidden = found.length - rows.length;
  return (
    <View style={styles.chooser}>
      <Field
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder={marketsCopy.searchPlaceholder}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {rows.map((entry) => (
        <Pressable
          key={entry.symbol}
          accessibilityRole="button"
          accessibilityLabel={`${entry.name}, ${entry.symbol}`}
          onPress={() => onChoose(entry.symbol)}
          style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
        >
          <TrackerMark symbol={entry.symbol} size="sm" />
          <Text style={styles.grow} numberOfLines={1}>
            {entry.name}
          </Text>
          <Text variant="faint">{entry.symbol}</Text>
        </Pressable>
      ))}
      {found.length === 0 ? (
        <Text variant="faint">{marketsCopy.noMatch}</Text>
      ) : (
        hidden > 0 && <Text variant="faint">{marketsCopy.chooser.more(hidden)}</Text>
      )}
    </View>
  );
}

/** The Risks screen's text, as a step inside a money sheet. */
export function RiskSections() {
  return mobileSettingsCopy.risks.sections.map((section) => (
    <View key={section.title} style={styles.risk}>
      <Text accessibilityRole="header" style={styles.medium}>
        {section.title}
      </Text>
      <Text tone="dim">{section.body}</Text>
    </View>
  ));
}

/** An amount typed at the screen's display size, labelled with its unit. */
export function AmountField({
  label,
  value,
  onChange,
  placeholder,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  editable?: boolean;
}) {
  return (
    <View style={styles.amount}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType="decimal-pad"
        keyboardAppearance="dark"
        selectionColor={colors.ink}
        autoComplete="off"
        maxFontSizeMultiplier={1.3}
        style={styles.amountInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { height: 3, borderRadius: 2, marginTop: -layout.tight },
  neutral: { opacity: 0.4 },
  acting: { gap: layout.inset },
  inline: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  medium: { fontFamily: fonts.medium },
  chooser: { gap: layout.tight },
  choice: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: layout.inset },
  pressed: { opacity: opacity.pressed },
  grow: { flex: 1 },
  risk: { gap: layout.hairline },
  amount: { gap: layout.tight },
  amountInput: {
    ...textStyles.display,
    minHeight: 56,
    padding: 0,
  },
});
