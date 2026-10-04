import { mobileAppCopy } from "@noirwire/shared/copy";
import { WarningIcon } from "phosphor-react-native/src/icons/Warning";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/ui";
import { colors, layout, radius, size } from "@/ui/theme";
import { useServices } from "../services";

type OfflineBannerProps = {
  /**
   * The app's own banner: it takes its place above everything else, under
   * the status bar, and the screens begin beneath it, so it never lies over a
   * header, a title or a control. Without it, the banner sits in the flow of
   * a sheet's content.
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
    <View style={pinned && [styles.pinned, { paddingTop: insets.top + layout.hairline }]}>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.banner}>
        <WarningIcon size={size.iconSmall} color={colors.warning} />
        <Text variant="faint" tone="warning" style={styles.text}>
          {mobileAppCopy.network.offline}
        </Text>
      </View>
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
  pinned: {
    paddingHorizontal: layout.gutter,
    paddingBottom: layout.hairline,
    backgroundColor: colors.base,
  },
  text: { flex: 1 },
});
