import { mobileAppCopy } from "@noirwire/shared/copy";
import { WarningIcon } from "phosphor-react-native/src/icons/Warning";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/ui";
import { colors, layout, radius, size } from "@/ui/theme";
import { useServices } from "../services";

type OfflineBannerProps = {
  /**
   * Pinned over the top edge of the app, under the status bar, and passing
   * every touch through to what is beneath it. Without it, the banner sits in
   * the flow of a sheet's content.
   */
  pinned?: boolean;
};

/**
 * Spec 3.5: a thin warning while the device has no connection. It has no
 * close control and disappears by itself.
 */
export function OfflineBanner({ pinned = false }: OfflineBannerProps) {
  const online = useServices().useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, pinned && [styles.pinned, { top: insets.top + layout.hairline }]]}
    >
      <WarningIcon size={size.iconSmall} color={colors.warning} />
      <Text variant="faint" tone="warning" style={styles.text}>
        {mobileAppCopy.network.offline}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.tight,
    paddingVertical: layout.tight,
    paddingHorizontal: layout.inset,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
  },
  pinned: { position: "absolute", left: layout.gutter, right: layout.gutter },
  text: { flex: 1 },
});
