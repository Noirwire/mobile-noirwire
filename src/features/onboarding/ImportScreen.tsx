import { commonCopy, onboardingCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import { parseRecoveryPhrase, type ImportResolution } from "@noirwire/shared/infrastructure";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Field, Notice, Screen, StepList, Text } from "@/ui";
import { errorHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { useServices } from "../services";
import { useAppLeaves } from "../security/useAppLeaves";
import { importProgressCopy, importSteps, LAST_STEP_AFTER_MS, withRetries } from "./importProgress";

type ImportScreenProps = {
  onFound: (words: string[], resolution: ImportResolution) => void;
  /** Tells the route whether Back may be used: not while the phrase is being checked. */
  onBusyChange?: (busy: boolean) => void;
};

export const SLOW_CHECK_MS = 3_000;

const copy = onboardingCopy.import;
const mobile = mobileOnboardingCopy.import;

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Spec 2.5: a 12 or 24 word phrase, checked on the phone and then against
 * the chain through the relay, each candidate address in its own request.
 * While that runs the form gives way to a progress list, a failed lookup is
 * tried again quietly, and only a lookup that keeps failing is reported.
 * The field is cleared whenever the app leaves the foreground.
 */
export function ImportScreen({ onFound, onBusyChange }: ImportScreenProps) {
  const { resolveImport, readClipboard, useOnline } = useServices();
  const online = useOnline();
  const [phrase, setPhrase] = useState("");
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [slow, setSlow] = useState(false);
  const [lastStep, setLastStep] = useState(false);
  const [failed, setFailed] = useState(false);
  useCaptureProtection(true);
  useAppLeaves(() => {
    if (!checking) setPhrase("");
  });

  useEffect(() => onBusyChange?.(checking), [checking, onBusyChange]);
  useEffect(() => {
    if (!checking) return;
    const slowTimer = setTimeout(() => setSlow(true), SLOW_CHECK_MS);
    const stepTimer = setTimeout(() => setLastStep(true), LAST_STEP_AFTER_MS);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(stepTimer);
      setSlow(false);
      setLastStep(false);
    };
  }, [checking]);

  const parsed = parseRecoveryPhrase(phrase);
  const invalid = "error" in parsed ? parsed.error : null;
  const count = wordsIn(phrase);

  async function submit() {
    setTouched(true);
    if ("error" in parsed) {
      errorHaptic();
      return;
    }
    setChecking(true);
    setFailed(false);
    const words = parsed.words;
    try {
      const resolution = await withRetries(() => resolveImport(words.join(" ")));
      setChecking(false);
      onFound(words, resolution);
    } catch {
      setChecking(false);
      setFailed(true);
      errorHaptic();
    }
  }

  if (checking) {
    return (
      <Screen edges={["right", "bottom", "left"]}>
        <View style={styles.intro}>
          <Text variant="display" accessibilityRole="header">
            {importProgressCopy.title}
          </Text>
          <Text tone="dim">{importProgressCopy.lead}</Text>
        </View>
        <StepList steps={importSteps(lastStep)} />
        {slow && <Text variant="faint">{importProgressCopy.slow}</Text>}
      </Screen>
    );
  }

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <View style={styles.intro}>
        <Text variant="display" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text tone="dim">{mobile.intro}</Text>
      </View>
      <View style={styles.group}>
        <Field
          label={copy.phraseLabel}
          placeholder={copy.phrasePlaceholder}
          value={phrase}
          onChangeText={setPhrase}
          onBlur={() => setTouched(true)}
          multiline
          numberOfLines={4}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          importantForAutofill="no"
          keyboardType="visible-password"
          textContentType="none"
          error={touched && phrase !== "" && invalid ? invalid : undefined}
        />
        <Text variant="faint">{copy.wordCount(count)}</Text>
        <View style={styles.paste}>
          <Button
            label={mobile.paste}
            variant="quiet"
            onPress={() => void readClipboard().then((text) => setPhrase(text))}
          />
        </View>
      </View>
      {failed && <Notice tone="danger">{importProgressCopy.failed}</Notice>}
      <View style={styles.group}>
        <Button
          label={commonCopy.continue}
          disabled={!online || invalid !== null}
          onPress={() => void submit()}
        />
        {!online && <Text variant="faint">{mobile.offline}</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  group: { gap: layout.tight },
  paste: { alignSelf: "flex-start" },
});
