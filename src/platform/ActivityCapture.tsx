import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type ActivityCaptureProps = { onInput: () => void; children: ReactNode };

/**
 * Hears every touch that starts anywhere below it, during the capture phase,
 * and lets it through untouched: it never becomes the responder.
 */
export function ActivityCapture({ onInput, children }: ActivityCaptureProps) {
  return (
    <View
      style={styles.fill}
      onStartShouldSetResponderCapture={() => {
        onInput();
        return false;
      }}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
