import { InfoIcon } from "phosphor-react-native/src/icons/Info";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, layout, radius, size } from "./theme";

type ActionNoticeProps = {
  children: string;
  /** The one control the notice offers, such as a Button that acts on it. */
  action?: ReactNode;
};

/** An information Notice that carries its own action beneath the message. */
export function ActionNotice({ children, action }: ActionNoticeProps) {
  return (
    <View style={styles.notice}>
      <View accessibilityRole="text" style={styles.message}>
        <InfoIcon size={size.iconSmall} color={colors.dim} />
        <Text variant="note" style={styles.copy}>
          {children}
        </Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: layout.group,
    padding: layout.group,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors["line-subtle"],
    backgroundColor: colors.surface,
  },
  message: { flexDirection: "row", gap: layout.inset },
  copy: { flex: 1 },
});
