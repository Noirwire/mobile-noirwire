import { StyleSheet, View } from "react-native";
import QRCodeSvg from "react-native-qrcode-svg";
import { readAsOne } from "./accessibility";
import { qrLayout } from "./qrLayout";
import { colors, radius, size as sizes } from "./theme";

type QRCodeProps = {
  /** The address to encode. Drawn on the device; never sent anywhere to be rendered. */
  value: string;
  /** Names whose address this is, for example "QR code of your funding address". */
  label: string;
  /** The whole card, quiet zone included. */
  size?: number;
};

/**
 * An address as a standard QR code: dark modules on an ivory card, with a
 * quiet zone of at least four modules, so any scanner reads it. Inverted
 * codes (light on dark) are not read by every exchange's scanner.
 */
export function QRCode({ value, label, size = 220 }: QRCodeProps) {
  const { matrix, quietZone } = qrLayout(size);
  return (
    <View {...readAsOne} accessibilityRole="image" accessibilityLabel={label} style={styles.card}>
      <QRCodeSvg
        value={value}
        size={matrix}
        color={colors.base}
        backgroundColor={colors["ink-strong"]}
        quietZone={quietZone}
        ecl="M"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: radius.panel,
    borderWidth: sizes.stroke,
    borderColor: colors.line,
    backgroundColor: colors["ink-strong"],
  },
});
