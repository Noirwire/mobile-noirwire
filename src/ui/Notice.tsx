import { InfoIcon } from "phosphor-react-native/src/icons/Info";
import { WarningIcon } from "phosphor-react-native/src/icons/Warning";
import { WarningOctagonIcon } from "phosphor-react-native/src/icons/WarningOctagon";
import { StyleSheet, View } from "react-native";
import { readAsOne } from "./accessibility";
import { Text } from "./Text";
import { colors, fonts, layout, radius, size, type ColorToken } from "./theme";

export type NoticeTone = "info" | "warning" | "danger";

type NoticeProps = {
  tone?: NoticeTone;
  title?: string;
  children: string;
};

const ICON = { info: InfoIcon, warning: WarningIcon, danger: WarningOctagonIcon } as const;
const ACCENT: Record<NoticeTone, ColorToken> = {
  info: "dim",
  warning: "warning",
  danger: "danger",
};

/** A warning or a danger interrupts a screen reader; plain information waits its turn. */
export function Notice({ tone = "info", title, children }: NoticeProps) {
  const Icon = ICON[tone];
  const accent = ACCENT[tone];
  return (
    <View
      {...readAsOne}
      accessibilityRole={tone === "info" ? "text" : "alert"}
      style={[styles.notice, tone !== "info" && { borderColor: colors[accent] }]}
    >
      <Icon size={size.iconSmall} color={colors[accent]} />
      <View style={styles.copy}>
        {title !== undefined && <Text style={styles.title}>{title}</Text>}
        <Text variant="note" tone={tone === "info" ? "dim" : accent}>
          {children}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    gap: layout.inset,
    padding: layout.group,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors["line-subtle"],
    backgroundColor: colors.surface,
  },
  copy: { flex: 1, gap: layout.hairline },
  title: { fontFamily: fonts.medium },
});
