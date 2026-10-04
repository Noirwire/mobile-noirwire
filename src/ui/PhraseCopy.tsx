import { commonCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { Notice } from "./Notice";
import { copySecret, SECRET_CLIPBOARD_MS } from "./secretClipboard";
import { Text } from "./Text";
import { layout } from "./theme";

type CopyState = "idle" | "confirming" | "copied" | "failed";

/** How long the button reads "Copied" before it returns to "Copy". */
export const COPIED_LABEL_MS = 2000;
const CLEAR_SECONDS = Math.round(SECRET_CLIPBOARD_MS / 1000);
const phraseCopy = mobileOnboardingCopy.phrase.copy;

/**
 * The one way a recovery phrase can be copied: an explicit Copy that first
 * says what the clipboard exposes, then copies and clears it again after 30
 * seconds, as the web app does.
 */
export function PhraseCopy({ phrase }: { phrase: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const [labelCopied, setLabelCopied] = useState(false);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (labelTimer.current) clearTimeout(labelTimer.current);
    },
    [],
  );

  async function copy() {
    try {
      await copySecret(phrase);
      setState("copied");
      setLabelCopied(true);
      if (labelTimer.current) clearTimeout(labelTimer.current);
      labelTimer.current = setTimeout(() => setLabelCopied(false), COPIED_LABEL_MS);
    } catch {
      setState("failed");
    }
  }

  if (state === "confirming") {
    return (
      <View style={styles.copy}>
        <Notice tone="warning" title={phraseCopy.confirmTitle}>
          {phraseCopy.confirmBody(CLEAR_SECONDS)}
        </Notice>
        <Button label={phraseCopy.copyAnyway} variant="danger" onPress={copy} />
        <Button label={commonCopy.cancel} variant="quiet" onPress={() => setState("idle")} />
      </View>
    );
  }

  return (
    <View style={styles.copy}>
      <Button
        label={labelCopied ? phraseCopy.copied : commonCopy.copy}
        variant="quiet"
        onPress={() => setState("confirming")}
      />
      {state === "copied" && (
        <Text variant="note" accessibilityLiveRegion="polite" style={styles.centred}>
          {phraseCopy.copiedNote(CLEAR_SECONDS)}
        </Text>
      )}
      {state === "failed" && (
        <Text variant="note" tone="danger" accessibilityRole="alert" style={styles.centred}>
          {phraseCopy.failed}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { gap: layout.tight },
  centred: { textAlign: "center" },
});
