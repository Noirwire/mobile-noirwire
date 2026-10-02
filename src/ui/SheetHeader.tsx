import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { StyleSheet, View } from "react-native";
import { IconButton } from "./IconButton";
import { Text } from "./Text";
import { colors, layout, radius, size } from "./theme";

type SheetHeaderProps = {
  title: string;
  /** From a sheet's second step on, the leading control goes one step back. */
  onBack?: () => void;
  /** Absent while an action is in flight: nothing may leave the sheet then. */
  onClose?: () => void;
};

/**
 * The grabber, the title and the sheet's controls. The close control is on
 * the first step only; later steps lead with Back instead.
 */
export function SheetHeader({ title, onBack, onClose }: SheetHeaderProps) {
  return (
    <View style={styles.header}>
      <View aria-hidden style={styles.grabber} />
      <View style={styles.bar}>
        {onBack && (
          <IconButton label="Back" onPress={onBack}>
            <CaretLeftIcon size={size.icon} color={colors.ink} />
          </IconButton>
        )}
        <Text variant="h2" style={styles.title}>
          {title}
        </Text>
        {onClose && !onBack && (
          <IconButton label={`Close ${title}`} onPress={onClose}>
            <XIcon size={size.iconSmall} color={colors.dim} />
          </IconButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: layout.tight, gap: layout.tight },
  grabber: {
    alignSelf: "center",
    width: size.grabberWidth,
    height: size.grabberHeight,
    borderRadius: radius.pill,
    backgroundColor: colors["line-strong"],
  },
  bar: {
    minHeight: size.minTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.tight,
  },
  title: { flex: 1 },
});
