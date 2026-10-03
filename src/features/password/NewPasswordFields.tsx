import { walletCopy } from "@noirwire/shared/copy";
import { useRef } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { Button, Field, Text } from "@/ui";
import { layout } from "@/ui/theme";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { mobileOnboardingCopy } from "../onboarding/copy";
import type { NewPassword } from "./newPassword";

type NewPasswordFieldsProps = {
  model: NewPassword;
  editable: boolean;
  /** The second field's return key, when both entries are ready. */
  onSubmit: () => void;
};

const copy = walletCopy.newPassword;
const REVEAL = { show: copy.show, hide: mobileOnboardingCopy.password.hide };

/** "New password" with its strength line, "Confirm password" with its mismatch line, and the write-it-down line. */
export function NewPasswordFields({ model, editable, onSubmit }: NewPasswordFieldsProps) {
  const confirmField = useRef<TextInput>(null);
  useCaptureProtection(model.revealed);

  return (
    <View style={styles.block}>
      <View style={styles.group}>
        <View style={styles.suggest}>
          <Button
            label={copy.suggest}
            variant="quiet"
            onPress={model.suggest}
            disabled={!editable}
          />
        </View>
        <Field
          label={copy.label}
          secure
          value={model.password}
          onChangeText={model.setPassword}
          editable={editable}
          revealed={model.revealed}
          onRevealedChange={model.setRevealed}
          revealLabels={REVEAL}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => confirmField.current?.focus()}
          submitBehavior="submit"
        />
        {model.strength && (
          <Text variant="faint" tone={model.strength.tone} accessibilityLiveRegion="polite">
            {model.strength.text}
          </Text>
        )}
      </View>
      <View style={styles.group}>
        <Field
          ref={confirmField}
          label={copy.confirm}
          secure
          value={model.confirm}
          onChangeText={model.setConfirm}
          editable={editable}
          revealed={model.revealed}
          onRevealedChange={model.setRevealed}
          revealLabels={REVEAL}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={() => model.ready && onSubmit()}
        />
        {model.mismatch && (
          <Text variant="faint" tone="danger">
            {model.mismatch}
          </Text>
        )}
      </View>
      {model.revealed && <Text variant="faint">{copy.writeItDown}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: layout.group },
  group: { gap: layout.tight },
  suggest: { alignSelf: "flex-end" },
});
