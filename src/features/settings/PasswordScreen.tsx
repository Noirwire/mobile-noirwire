import { settingsCopy, walletCopy } from "@noirwire/shared/copy";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Field, Notice, Screen } from "@/ui";
import { errorHaptic, successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { NewPasswordFields } from "../password/NewPasswordFields";
import { useNewPassword } from "../password/newPassword";
import { updatePassword } from "../wallet/walletActions";
import { mobileSettingsCopy } from "./copy";

const copy = settingsCopy.password;

type Outcome = { kind: "changed" } | { kind: "failed" } | null;

/**
 * Spec 2.30: a new password, after the current one is typed again even
 * while unlocked. The shared store re-encrypts the record as one write, so a
 * failure leaves the old password working.
 */
export function PasswordScreen() {
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
    const problem = await updatePassword(current, model.password);
    setBusy(false);
    if (!problem) {
      successHaptic();
      setCurrent("");
      model.clear();
      setOutcome({ kind: "changed" });
      return;
    }
    errorHaptic();
    if (problem === walletCopy.store.currentPasswordWrong) {
      setCurrentWrong(true);
      setCurrent("");
    } else setOutcome({ kind: "failed" });
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
        {outcome?.kind === "changed" && <Notice>{mobileSettingsCopy.password.changed}</Notice>}
        {outcome?.kind === "failed" && <Notice tone="danger">{copy.failed}</Notice>}
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
