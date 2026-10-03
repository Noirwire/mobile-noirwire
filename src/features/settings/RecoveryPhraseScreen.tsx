import { commonCopy, settingsCopy } from "@noirwire/shared/copy";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { Button, Field, Notice, PhraseGrid, Screen, Text } from "@/ui";
import { errorHaptic, lightHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { useAppLeaves } from "../security/useAppLeaves";
import { SCREENSHOT_WARNING, useScreenshotWarning } from "../security/useScreenshotWarning";
import { revealPhrase } from "../wallet/walletActions";
import { mobileSettingsCopy } from "./copy";

/** The phrase hides itself this long after it is shown. */
export const PHRASE_VISIBLE_MS = 60_000;

const copy = settingsCopy.recovery;

/**
 * Spec 2.29: the phrase for someone who types the password now. Biometrics
 * and an unlocked app are not enough. It hides after a minute, on Hide, and
 * when the app leaves the foreground; the route remounts this screen when it
 * loses focus, which drops the words too.
 */
export function RecoveryPhraseScreen() {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [words, setWords] = useState<string[] | null>(null);
  const screenshot = useScreenshotWarning(words !== null);

  const hide = (announce: boolean) => {
    setWords(null);
    if (announce)
      AccessibilityInfo.announceForAccessibility(mobileSettingsCopy.phrase.hiddenAnnouncement);
  };
  useAppLeaves(() => hide(false));

  useEffect(() => {
    if (!words) return;
    const timer = setTimeout(() => hide(true), PHRASE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [words]);

  async function show() {
    if (password === "" || checking) return;
    setChecking(true);
    setWrong(false);
    const phrase = await revealPhrase(password);
    setChecking(false);
    setPassword("");
    if (!phrase) {
      setWrong(true);
      errorHaptic();
      return;
    }
    lightHaptic();
    setWords(phrase);
  }

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Text tone="dim">{copy.lead}</Text>
      {screenshot && <Notice tone="warning">{SCREENSHOT_WARNING}</Notice>}
      {words ? (
        <View style={styles.group}>
          <PhraseGrid words={words} revealed onReveal={() => undefined} />
          <Text variant="faint">{copy.hidesItself}</Text>
          <Button label={copy.hide} variant="quiet" onPress={() => hide(false)} />
        </View>
      ) : (
        <View style={styles.group}>
          <Field
            label={copy.passwordLabel}
            secure
            value={password}
            onChangeText={setPassword}
            editable={!checking}
            textContentType="password"
            autoComplete="current-password"
            onSubmitEditing={() => void show()}
            error={wrong ? copy.wrongPassword : undefined}
          />
          <Button
            label={copy.show}
            loading={checking}
            loadingLabel={commonCopy.checking}
            disabled={password === ""}
            onPress={() => void show()}
          />
        </View>
      )}
      <Text variant="faint">{copy.footnote}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { gap: layout.tight } });
