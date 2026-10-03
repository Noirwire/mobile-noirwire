import { walletCopy } from "@noirwire/shared/copy";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import type { BiometricMethod } from "@/platform/biometricKeystore";
import { Button, Divider, Field, Mark, Notice, Screen, Text } from "@/ui";
import { errorHaptic, successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { mobileResetCopy } from "../reset/copy";
import { takeResetRefused } from "../reset/resetOutcome";
import { useServices } from "../services";
import { noteUnlocked, unlockWithPassword } from "../wallet/walletActions";
import { isWrongPassword, mobileUnlockCopy, unlockProblemText } from "./copy";

type UnlockScreenProps = { onReset: () => void };

type Message = { tone: "info" | "danger"; text: string };

const copy = walletCopy.unlock;

/**
 * Spec 2.10: opens the stored wallet. Shows nothing about it: no balance, no
 * name, no address, no count. No attempt counter and no lockout; the
 * password's strength is the protection.
 */
export function UnlockScreen({ onReset }: UnlockScreenProps) {
  const { biometric } = useServices();
  const setting = useSyncExternalStore(biometric.subscribe, biometric.setting);
  const [method, setMethod] = useState<BiometricMethod | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(() =>
    takeResetRefused() ? { tone: "danger", text: mobileResetCopy.notRemoved } : null,
  );
  const field = useRef<TextInput>(null);
  const prompted = useRef(false);
  const biometricOn = setting === "on" && method !== null;

  useEffect(() => {
    let current = true;
    void biometric.method().then((found) => current && setMethod(found));
    return () => {
      current = false;
    };
  }, [biometric]);

  async function unlockWithBiometrics(name: string) {
    setBusy(true);
    const result = await biometric.unlock(mobileUnlockCopy.prompt);
    setBusy(false);
    switch (result.kind) {
      case "unlocked":
        noteUnlocked();
        successHaptic();
        return;
      case "lockedOut":
        setMessage({ tone: "info", text: mobileUnlockCopy.lockedOut(name) });
        break;
      case "changed":
        setMessage({ tone: "info", text: mobileUnlockCopy.changed(name) });
        break;
      case "refused":
        setMessage({ tone: "danger", text: unlockProblemText(result.problem) });
        break;
    }
    field.current?.focus();
  }

  useEffect(() => {
    if (!biometricOn || !method || prompted.current) return;
    prompted.current = true;
    void unlockWithBiometrics(method.name);
    // The prompt is shown once, when biometric unlock is known to be on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricOn]);

  async function submit() {
    if (password === "" || busy) return;
    setBusy(true);
    setFieldError(null);
    const problem = await unlockWithPassword(password);
    if (!problem) {
      successHaptic();
      return;
    }
    setBusy(false);
    errorHaptic();
    if (isWrongPassword(problem)) {
      setFieldError(problem);
      setPassword("");
      field.current?.focus();
    } else setMessage({ tone: "danger", text: unlockProblemText(problem) });
  }

  return (
    <Screen>
      <View style={styles.intro}>
        <Mark size={40} />
        <Text variant="display" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text tone="dim">{mobileUnlockCopy.lead}</Text>
      </View>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <View style={styles.group}>
        <Field
          ref={field}
          label={copy.password}
          secure
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          autoFocus={setting !== "on"}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          error={fieldError ?? undefined}
        />
        <Button
          label={copy.unlock}
          loading={busy}
          loadingLabel={copy.unlocking}
          disabled={password === ""}
          onPress={() => void submit()}
        />
        {biometricOn && method && (
          <Button
            label={mobileUnlockCopy.use(method.name)}
            variant="quiet"
            disabled={busy}
            onPress={() => void unlockWithBiometrics(method.name)}
          />
        )}
      </View>
      <View style={styles.group}>
        <Divider />
        <Text variant="faint">{mobileUnlockCopy.forgotten}</Text>
        <View style={styles.reset}>
          <Button label={copy.reset} variant="quiet" onPress={onReset} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group, marginTop: layout.section },
  group: { gap: layout.tight },
  reset: { alignSelf: "flex-start" },
});
