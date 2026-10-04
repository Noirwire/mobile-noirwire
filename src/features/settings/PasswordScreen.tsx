import {
  mobileSettingsCopy,
  mobileWalletCopy,
  settingsCopy,
  walletCopy,
} from "@noirwire/shared/copy";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Field, Notice, Screen } from "@/ui";
import { errorHaptic, successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { NewPasswordFields } from "../password/NewPasswordFields";
import { useNewPassword } from "../password/newPassword";
import { useServices } from "../services";
import { updatePassword } from "../wallet/walletActions";

const copy = settingsCopy.password;

/** What the screen says after an attempt: it went through, it did not, or it cannot be told which. */
type Outcome = { tone: "info" | "warning" | "danger"; lines: string[] } | null;

/**
 * Spec 2.30: a new password, after the current one is typed again even
 * while unlocked. The shared store re-encrypts the record as one write, so a
 * failure leaves the old password working. While biometric unlock is on,
 * the device keystore takes the new key too, or the change is undone. A
 * change whose result cannot be read back says so, and how to find out.
 */
export function PasswordScreen() {
  const { biometric } = useServices();
  const model = useNewPassword();
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentWrong, setCurrentWrong] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function change() {
    if (!model.ready || current === "" || busy) return;
    setBusy(true);
    setCurrentWrong(false);
    setOutcome(null);
    const result = await updatePassword(
      biometric,
      current,
      model.password,
      mobileWalletCopy.unlock.prompt,
    );
    setBusy(false);
    if (result.outcome === "changed") {
      successHaptic();
      setCurrent("");
      model.clear();
      setOutcome({
        tone: result.notice ? "warning" : "info",
        lines: [mobileSettingsCopy.password.changed, ...(result.notice ? [result.notice] : [])],
      });
      return;
    }
    errorHaptic();
    if (result.outcome === "indeterminate") {
      setCurrent("");
      model.clear();
      setOutcome({ tone: "warning", lines: [result.reason] });
    } else if (result.reason === walletCopy.store.currentPasswordWrong) {
      setCurrentWrong(true);
      setCurrent("");
    } else setOutcome({ tone: "danger", lines: [result.reason] });
  }

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Field
        label={copy.current}
        secure
        value={current}
        onChangeText={setCurrent}
        editable={!busy}
        textContentType="password"
        autoComplete="current-password"
        error={currentWrong ? walletCopy.store.currentPasswordWrong : undefined}
      />
      <NewPasswordFields model={model} editable={!busy} onSubmit={() => void change()} />
      <View style={styles.actions}>
        {outcome?.lines.map((line) => (
          <Notice key={line} tone={outcome.tone}>
            {line}
          </Notice>
        ))}
        <Button
          label={copy.submit}
          loading={busy}
          loadingLabel={copy.reEncrypting}
          disabled={!model.ready || current === ""}
          onPress={() => void change()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { gap: layout.group } });
