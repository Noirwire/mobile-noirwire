import { onboardingCopy, walletCopy, mobileOnboardingCopy } from "@noirwire/shared/copy";
import type { WalletDraft } from "@noirwire/shared/wallet";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Notice, Screen, StillWorking, Text, useTopLoader, useWaiting } from "@/ui";
import { successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { NewPasswordFields } from "../password/NewPasswordFields";
import { useNewPassword } from "../password/newPassword";
import { useAppLeaves } from "../security/useAppLeaves";
import { saveNewWallet, type SaveOrigin } from "../wallet/walletActions";

type SetPasswordScreenProps = {
  draft: WalletDraft;
  origin: SaveOrigin;
  /** Called with the password, which only the biometric offer that may follow still needs. */
  onSaved: (password: string) => void;
};

const copy = onboardingCopy.password;
const mobile = mobileOnboardingCopy.password;

/** What the store's refusal means on a phone. */
export function saveProblemText(message: string): string {
  if (message === walletCopy.store.notSaved) return mobile.notSaved;
  if (message === walletCopy.store.walletExists) return mobile.alreadyStored;
  return copy.encryptFailed;
}

/**
 * Spec 2.8: the password that seals the wallet. Nothing is stored until it
 * is strong and confirmed; the fields are cleared if the app leaves the
 * foreground before then.
 */
export function SetPasswordScreen({ draft, origin, onSaved }: SetPasswordScreenProps) {
  const model = useNewPassword();
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const waiting = useWaiting(saving, "action");
  useTopLoader(saving);
  useAppLeaves(() => {
    if (!saving) model.clear();
  });

  async function save() {
    if (!model.ready || saving) return;
    setSaving(true);
    setProblem(null);
    try {
      await saveNewWallet(draft, origin, model.password);
      successHaptic();
      onSaved(model.password);
    } catch (error) {
      setProblem(saveProblemText(error instanceof Error ? error.message : ""));
      setSaving(false);
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
      <NewPasswordFields model={model} editable={!saving} onSubmit={() => void save()} />
      {problem && <Notice tone="danger">{problem}</Notice>}
      <View style={styles.actions}>
        <Button label={copy.finish} disabled={!model.ready || saving} onPress={() => void save()} />
        <StillWorking waiting={waiting} />
        <Text variant="faint">{copy.forgotten}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  actions: { gap: layout.tight },
});
