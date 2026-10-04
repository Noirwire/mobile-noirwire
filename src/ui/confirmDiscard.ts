import { discardPromptView } from "@noirwire/shared/presentation";
import { Alert, Platform } from "react-native";

/**
 * Asks before throwing away what someone has entered in a sheet. This and the
 * system's own prompts are the only alerts the app shows. The browser build
 * has no native alert, so it asks with the browser's own dialog.
 */
export function confirmDiscard(onDiscard: () => void) {
  const prompt = discardPromptView();
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${prompt.title}\n\n${prompt.body}`)) onDiscard();
    return;
  }
  Alert.alert(prompt.title, prompt.body, [
    { text: prompt.keep, style: "cancel" },
    { text: prompt.discard, style: "destructive", onPress: onDiscard },
  ]);
}
