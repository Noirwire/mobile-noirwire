import { commonCopy, settingsCopy, walletCopy } from "@noirwire/shared/copy";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Field, Notice, Screen, Text } from "@/ui";
import { heavyHaptic, warningHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { useServices } from "../services";
import { deleteWallet } from "../wallet/walletActions";
import { mobileResetCopy } from "./copy";

type ResetScreenProps = {
  onCancel: () => void;
  /** The vault kept the wallet. It is locked either way, so the caller may be leaving this screen. */
  onRefused?: () => void;
  /** Pushed under a header that already shows the title. */
  underHeader?: boolean;
};

const confirm = walletCopy.resetConfirm;

/** Exactly RESET, ignoring surrounding spaces, enables the delete. */
export const confirmsReset = (typed: string) => typed.trim() === confirm.word;

/**
 * Spec 2.11: deletes the wallet from this phone after the word RESET is
 * typed. Typing the word is the confirmation; no system alert is added.
 */
export function ResetScreen({ onCancel, onRefused, underHeader = false }: ResetScreenProps) {
  const { biometric } = useServices();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => warningHaptic(), []);

  async function remove() {
    heavyHaptic();
    setDeleting(true);
    setRefused(false);
    const result = await deleteWallet(biometric);
    if (result.ok) return;
    setDeleting(false);
    setRefused(true);
    onRefused?.();
  }

  return (
    <Screen edges={underHeader ? ["right", "bottom", "left"] : undefined}>
      {!underHeader && (
        <Text variant="display" accessibilityRole="header">
          {settingsCopy.reset.title}
        </Text>
      )}
      <Notice tone="danger">{mobileResetCopy.warning}</Notice>
      <Field
        label={confirm.typeToConfirm(confirm.word)}
        value={typed}
        onChangeText={setTyped}
        editable={!deleting}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
      />
      {refused && <Notice tone="danger">{mobileResetCopy.notRemoved}</Notice>}
      <View style={styles.actions}>
        <Button
          label={confirm.delete}
          variant="danger"
          loading={deleting}
          loadingLabel={mobileResetCopy.deleting}
          disabled={!confirmsReset(typed)}
          onPress={() => void remove()}
        />
        <Button label={commonCopy.cancel} variant="quiet" disabled={deleting} onPress={onCancel} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: layout.tight },
});
