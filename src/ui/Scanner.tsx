import * as Clipboard from "expo-clipboard";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { CameraAccess } from "./CameraAccess";
import { readScannedText } from "./scannedText";
import { Text } from "./Text";
import { colors, layout, radius, size } from "./theme";

type ScannerProps = {
  /**
   * Receives the text of a scanned code or of a paste, trimmed and nothing
   * more. The caller decides whether it is an address, and stays where it is
   * if it is not: the scanner never navigates or acts on its own.
   */
  onRead: (text: string) => void;
  /** One line under the camera, for example "Point the camera at the recipient's address code." */
  hint: string;
};

/** The camera reports the same code many times a second while it is in view. */
export const REPEAT_WINDOW_MS = 1500;
const QR_ONLY = { barcodeTypes: ["qr" as const] };
/** The guide square, as a share of the camera view. */
const GUIDE_SHARE = "62%";

/**
 * Camera QR scanning with a square guide, the permission request with a plain
 * reason, and a paste alternative that is always visible. The camera frame is
 * never stored or sent; only the decoded text leaves this component.
 */
export function Scanner({ onRead, hint }: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastRead = useRef<{ text: string; at: number } | null>(null);

  function scanned(result: BarcodeScanningResult) {
    const text = readScannedText(result.data);
    if (text === null) return;
    const now = Date.now();
    const previous = lastRead.current;
    if (previous && previous.text === text && now - previous.at < REPEAT_WINDOW_MS) return;
    lastRead.current = { text, at: now };
    onRead(text);
  }

  /** Reads the clipboard once, on this explicit tap only. A refused read leaves nothing to report. */
  async function paste() {
    const text = readScannedText(await Clipboard.getStringAsync().catch(() => null));
    if (text !== null) onRead(text);
  }

  return (
    <View style={styles.scanner}>
      {permission === null ? (
        <View style={styles.viewport} />
      ) : permission.granted ? (
        <View style={styles.viewport}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={QR_ONLY}
            onBarcodeScanned={scanned}
          />
          <View aria-hidden style={styles.guide} />
        </View>
      ) : (
        <CameraAccess
          state={permission.canAskAgain ? "ask" : "blocked"}
          onAllow={() => requestPermission()}
        />
      )}
      {permission?.granted && <Text variant="note">{hint}</Text>}
      <Button label="Paste instead" variant="quiet" onPress={paste} />
    </View>
  );
}

const styles = StyleSheet.create({
  scanner: { gap: layout.group },
  viewport: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.panel,
    backgroundColor: colors.elevated,
  },
  guide: {
    width: GUIDE_SHARE,
    aspectRatio: 1,
    borderRadius: radius.panel,
    borderWidth: size.checkboxBorder,
    borderColor: colors["ink-strong"],
  },
});
