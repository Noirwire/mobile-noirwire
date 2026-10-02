import { Linking, Platform, StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { Mark } from "./Mark";
import { Text } from "./Text";
import { layout } from "./theme";

export type CameraAccessState = "ask" | "blocked";

export const CAMERA_PURPOSE = "NoirWire uses the camera only to scan a QR code you point it at.";

type CameraAccessProps = {
  state: CameraAccessState;
  /** Shows the system prompt. Only offered while the system will still show one. */
  onAllow: () => void;
};

/**
 * What the scanner shows without the camera: a plain reason and the system
 * prompt while it can still be asked for, or the way to system settings once
 * it has been turned off there. The paste alternative sits beside it.
 */
export function CameraAccess({ state, onAllow }: CameraAccessProps) {
  return (
    <View style={styles.access}>
      <Mark size={40} tone="line-strong" />
      {state === "ask" ? (
        <>
          <Text style={styles.centred}>{CAMERA_PURPOSE}</Text>
          <Button label="Allow camera" onPress={onAllow} />
        </>
      ) : (
        <>
          <Text style={styles.centred}>Camera access is off.</Text>
          <Text variant="note" style={styles.centred}>
            Allow the camera in system settings to scan a code, or paste the address instead.
          </Text>
          {Platform.OS !== "web" && (
            <Button label="Open settings" variant="quiet" onPress={() => Linking.openSettings()} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  access: { alignItems: "stretch", gap: layout.inset, paddingVertical: layout.section },
  centred: { textAlign: "center", alignSelf: "center" },
});
