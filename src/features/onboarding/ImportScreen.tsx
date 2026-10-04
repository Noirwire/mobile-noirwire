import { commonCopy, onboardingCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import {
  parseRecoveryPhrase,
  phraseWords,
  type ImportResolution,
} from "@noirwire/shared/infrastructure";
import { importFailedText, importWaitingView } from "@noirwire/shared/presentation";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Button, Field, Notice, Screen, Text, useTopLoader, useWaiting } from "@/ui";
import { errorHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { ProtectionRefused } from "@/ui/ProtectionRefused";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { useServices } from "../services";
import { useAppLeaves } from "../security/useAppLeaves";

type ImportScreenProps = {
  onFound: (words: string[], resolution: ImportResolution) => void;
};

/** The longest an import may run before the screen says it could not finish. */
export const IMPORT_LIMIT_MS = 180_000;

const copy = onboardingCopy.import;
const mobile = mobileOnboardingCopy.import;

/** Lets the top loader be drawn before the lookup starts its heavy work. */
const afterNextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/**
 * Spec 2.5: a 12 or 24 word phrase, checked on the phone and then against
 * the chain through the relay, each candidate address in its own request.
 * Continue can always be pressed, and a phrase that is refused is told why.
 * The form stays on screen for the whole lookup: the field holds what was
 * typed, Continue keeps its own label, and the app's one top loader runs
 * until it answers. Cancel stays available; an import that cannot finish,
 * goes offline or runs past its limit ends with one plain message and the
 * form usable again, phrase kept. The field is cleared whenever the app
 * leaves the foreground.
 */
export function ImportScreen({ onFound }: ImportScreenProps) {
  const { resolveImport, readClipboard, useOnline } = useServices();
  const online = useOnline();
  const [phrase, setPhrase] = useState("");
  /** The field has been left, or the keyboard closed: what is wrong with a typed phrase is said. */
  const [touched, setTouched] = useState(false);
  /** Continue was pressed: an empty field is told what it needs too. */
  const [asked, setAsked] = useState(false);
  /** The lookup under way, by its number; null while the form is shown. */
  const [run, setRun] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const runs = useRef(0);
  const current = useRef<number | null>(null);
  const importing = run !== null;
  const waiting = useWaiting(importing, "action", { limitMs: IMPORT_LIMIT_MS });
  const progress = importWaitingView(waiting.elapsedMs, "mobile");
  useTopLoader(importing);

  const protection = useCaptureProtection(true);
  useAppLeaves(() => {
    if (!importing) setPhrase("");
  });

  useEffect(() => {
    const hidden = Keyboard.addListener("keyboardDidHide", () => setTouched(true));
    return () => hidden.remove();
  }, []);

  useEffect(
    () => () => {
      current.current = null;
    },
    [],
  );

  /** Ends the lookup under way. What it answers later is ignored. */
  function end(outcome: "cancelled" | "failed") {
    current.current = null;
    setRun(null);
    if (outcome === "failed") setFailed(true);
  }

  // Going offline, or running past the limit, ends the lookup with the plain failure.
  if (importing && (!online || waiting.overdue)) {
    setRun(null);
    setFailed(true);
  }
  useEffect(() => {
    if (!importing) current.current = null;
  }, [importing]);
  useEffect(() => {
    if (failed) errorHaptic();
  }, [failed]);

  const parsed = parseRecoveryPhrase(phrase);
  const refusal = "error" in parsed ? parsed.error : null;
  const count = phraseWords(phrase).length;

  async function submit() {
    setAsked(true);
    if ("error" in parsed) {
      errorHaptic();
      return;
    }
    if (!online || importing) return;
    Keyboard.dismiss();
    const mine = ++runs.current;
    current.current = mine;
    setFailed(false);
    setRun(mine);
    const words = parsed.words;
    try {
      await afterNextFrame();
      const resolution = await resolveImport(words.join(" "));
      if (current.current !== mine) return;
      await afterNextFrame();
      if (current.current !== mine) return;
      current.current = null;
      setRun(null);
      onFound(words, resolution);
    } catch {
      if (current.current === mine) end("failed");
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
      <ProtectionRefused protection={protection} />
      {/* The phrase is typed in the clear, so its field exists only once the screen is protected. */}
      {protection.ready && (
        <View style={styles.group}>
          <Field
            label={copy.phraseLabel}
            placeholder={copy.phrasePlaceholder}
            value={phrase}
            onChangeText={setPhrase}
            onBlur={() => setTouched(true)}
            editable={!importing}
            lines={4}
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            importantForAutofill="no"
            keyboardType="visible-password"
            textContentType="none"
            error={refusal && (asked || (touched && phrase.trim() !== "")) ? refusal : undefined}
          />
          <Text variant="faint">{copy.wordCount(count)}</Text>
          <View style={styles.paste}>
            <Button
              label={mobile.paste}
              variant="quiet"
              disabled={importing}
              onPress={() => void readClipboard().then((text) => setPhrase(text))}
            />
          </View>
        </View>
      )}
      {failed && <Notice tone="danger">{importFailedText("mobile")}</Notice>}
      <View style={styles.group}>
        <Button
          label={commonCopy.continue}
          disabled={!online || !protection.ready || importing}
          onPress={() => void submit()}
        />
        {importing && progress.stillWorking !== null && (
          <Text variant="faint" accessibilityLiveRegion="polite">
            {progress.stillWorking}
          </Text>
        )}
        {!online && !importing && <Text variant="faint">{mobile.offline}</Text>}
        {importing && (
          <Button label={commonCopy.cancel} variant="quiet" onPress={() => end("cancelled")} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  group: { gap: layout.tight },
  paste: { alignSelf: "flex-start" },
});
