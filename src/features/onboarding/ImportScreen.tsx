import { commonCopy, onboardingCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import { parseRecoveryPhrase, type ImportResolution } from "@noirwire/shared/infrastructure";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Field, Notice, Screen, Text } from "@/ui";
import { errorHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { useServices } from "../services";
import { useAppLeaves } from "../security/useAppLeaves";

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
 * The field is cleared whenever the app leaves the foreground.
 */
export function ImportScreen({ onFound, onBusyChange }: ImportScreenProps) {
  const { resolveImport, readClipboard, useOnline } = useServices();
  const online = useOnline();
  const [phrase, setPhrase] = useState("");
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [slow, setSlow] = useState(false);
  const [networkFailed, setNetworkFailed] = useState(false);
  useCaptureProtection(true);
  useAppLeaves(() => {
    if (!checking) setPhrase("");
  });

  useEffect(() => onBusyChange?.(checking), [checking, onBusyChange]);
  useEffect(() => {
    if (!checking) return;
    const timer = setTimeout(() => setSlow(true), SLOW_CHECK_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
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
    setNetworkFailed(false);
    try {
      const resolution = await resolveImport(parsed.words.join(" "));
      setChecking(false);
      onFound(parsed.words, resolution);
    } catch {
      setChecking(false);
      setNetworkFailed(true);
      errorHaptic();
    }
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
          editable={!checking}
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
            disabled={checking}
            onPress={() => void readClipboard().then((text) => setPhrase(text))}
          />
        </View>
      </View>
      {networkFailed && <Notice tone="danger">{mobile.networkFailed}</Notice>}
      <View style={styles.group}>
        <Button
          label={commonCopy.continue}
          loading={checking}
          loadingLabel={mobile.checking}
          disabled={!online || invalid !== null}
          onPress={() => void submit()}
        />
        {!online && <Text variant="faint">{mobile.offline}</Text>}
        {checking && slow && <Text variant="faint">{mobile.slow}</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  group: { gap: layout.tight },
  paste: { alignSelf: "flex-start" },
});
