import { mobileSendCopy } from "@noirwire/shared/copy";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { Mark } from "./Mark";
import { Text } from "./Text";
import { layout } from "./theme";

export type CameraAccessState = "ask" | "blocked";

const cameraCopy = mobileSendCopy.camera;
export const CAMERA_PURPOSE = cameraCopy.purpose;

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
          <Button label={cameraCopy.allow} onPress={onAllow} />
        </>
      ) : (
        <>
          <Text style={styles.centred}>{cameraCopy.off}</Text>
          <Text variant="note" style={styles.centred}>
            {cameraCopy.offDetail}
          </Text>
          {Platform.OS !== "web" && (
            <Button
              label={cameraCopy.openSettings}
              variant="quiet"
              onPress={() => Linking.openSettings()}
            />
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
