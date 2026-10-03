import { commonCopy, onboardingCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Acknowledge, Button, Notice, PhraseGrid, Screen, Text } from "@/ui";
import { layout } from "@/ui/theme";
import { useAppLeaves } from "../security/useAppLeaves";
import { SCREENSHOT_WARNING, useScreenshotWarning } from "../security/useScreenshotWarning";

type PhraseScreenProps = { words: readonly string[]; onContinue: () => void };

const copy = onboardingCopy.phrase;

/**
 * Spec 2.3: the twelve words, concealed until Reveal and concealed again
 * whenever the app leaves the foreground. No Copy: a phone clipboard syncs
 * and keyboards can read it.
 */
export function PhraseScreen({ words, onContinue }: PhraseScreenProps) {
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const screenshot = useScreenshotWarning(revealed);
  useAppLeaves(() => setRevealed(false));
  const ready = revealed && saved;

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <View style={styles.intro}>
        <Text variant="display" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text tone="dim">{mobileOnboardingCopy.phrase.intro}</Text>
      </View>
      {screenshot && <Notice tone="warning">{SCREENSHOT_WARNING}</Notice>}
      <PhraseGrid words={words} revealed={revealed} onReveal={() => setRevealed(true)} />
      <View style={styles.actions}>
        <Acknowledge label={copy.saved} checked={saved} onChange={setSaved} />
        <Button
          label={commonCopy.continue}
          variant={revealed ? "primary" : "quiet"}
          disabled={!ready}
          onPress={onContinue}
        />
        {!ready && <Text variant="faint">{mobileOnboardingCopy.phrase.continueReason}</Text>}
      </View>
      <Text variant="faint">{copy.neverAsked}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  actions: { gap: layout.tight },
});
