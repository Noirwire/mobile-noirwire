import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, layout, radius } from "./theme";

type PanelProps = ViewProps & { raised?: boolean };

export function Panel({ raised = false, style, ...rest }: PanelProps) {
  return <View {...rest} style={[styles.panel, raised && styles.raised, style]} />;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors["line-subtle"],
    backgroundColor: colors.surface,
    padding: layout.group,
  },
  raised: { borderColor: colors.line, backgroundColor: colors["surface-raised"] },
});
