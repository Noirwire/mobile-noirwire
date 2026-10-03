import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { FingerprintIcon } from "phosphor-react-native/src/icons/Fingerprint";
import { ScanSmileyIcon } from "phosphor-react-native/src/icons/ScanSmiley";
import { Button, Notice, Screen, Text } from "@/ui";
import { successHaptic } from "@/ui/haptics";
import { colors, layout } from "@/ui/theme";
import { useServices } from "../services";
import { mobileUnlockCopy } from "../unlock/copy";
import { mobileOnboardingCopy } from "@noirwire/shared/copy";

type BiometricOfferScreenProps = {
  method: string;
  /** The password just set, held only until this screen is left. */
  password: string;
  onDone: () => void;
};

const copy = mobileOnboardingCopy.biometric;
const FACE = /face/i;

/** Spec 2.9: biometric unlock offered once, as a choice. Off unless turned on here or in Settings. */
export function BiometricOfferScreen({ method, password, onDone }: BiometricOfferScreenProps) {
  const { biometric } = useServices();
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
  const Glyph = FACE.test(method) ? ScanSmileyIcon : FingerprintIcon;

  async function turnOn() {
    setBusy(true);
    const result = await biometric.turnOn(password, mobileUnlockCopy.prompt);
    setBusy(false);
    if (result === "on") {
      successHaptic();
      onDone();
    } else setDeclined(true);
  }

  return (
    <Screen>
      <View style={styles.intro}>
        <Glyph size={40} color={colors.ink} />
        <Text variant="display" accessibilityRole="header">
          {copy.title(method)}
        </Text>
        <Text tone="dim">{copy.lead(method)}</Text>
      </View>
      {declined && <Notice>{copy.notTurnedOn(method)}</Notice>}
      <View style={styles.actions}>
        <Button label={copy.use(method)} loading={busy} onPress={() => void turnOn()} />
        <Button label={copy.notNow} variant="quiet" disabled={busy} onPress={onDone} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group, marginTop: layout.section },
  actions: { gap: layout.tight },
});
