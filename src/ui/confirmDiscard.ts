import { commonCopy } from "@noirwire/shared/copy";
import { Alert, Platform } from "react-native";

export const DISCARD_TITLE = commonCopy.discardThis;

/**
 * Asks before throwing away what someone has entered in a sheet. This and the
 * system's own prompts are the only alerts the app shows. The browser build
 * has no native alert, so it asks with the browser's own dialog.
 */
export function confirmDiscard(onDiscard: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(DISCARD_TITLE)) onDiscard();
    return;
  }
  Alert.alert(DISCARD_TITLE, undefined, [
    { text: commonCopy.keepEditing, style: "cancel" },
    { text: commonCopy.discard, style: "destructive", onPress: onDiscard },
  ]);
}
