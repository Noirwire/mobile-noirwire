import { settingsCopy } from "@noirwire/shared/copy";
import { useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import type { BiometricMethod } from "@/platform/biometricKeystore";
import { Button, Field, ListRow, Notice, Panel, Screen, Switch, Text } from "@/ui";
import { successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { FUNDING_WALLET_SECTION, FundingWalletRow } from "../funding/FundingWalletRow";
import { useServices } from "../services";
import { mobileUnlockCopy } from "../unlock/copy";
import { useStorageHealth } from "../wallet/useWallet";
import { lockNow } from "../wallet/walletActions";
import { mobileSettingsCopy } from "./copy";

export type SettingsPage =
  "recovery-phrase" | "password" | "funding-wallet" | "privacy" | "risks" | "about" | "reset";

type SettingsScreenProps = {
  onOpen: (page: SettingsPage) => void;
  appVersion: string;
};

const sections = settingsCopy.sections;
const mobile = mobileSettingsCopy;

/** Spec 2.25: one list for security, privacy and the things done rarely. */
export function SettingsScreen({ onOpen, appVersion }: SettingsScreenProps) {
  const { preferences } = useServices();
  const health = useStorageHealth();
  const analytics = useSyncExternalStore(preferences.subscribe, preferences.analyticsEnabled);

  return (
    <Screen>
      <Text variant="h1">{settingsCopy.title}</Text>
      {health.saveFailing && <Notice tone="danger">{mobile.saveFailing}</Notice>}
      {health.cleanupFailing && <Notice tone="warning">{mobile.cleanupFailing}</Notice>}
      {health.saving && !health.saveFailing && (
        <Text variant="faint" accessibilityLiveRegion="polite">
          {mobile.saving}
        </Text>
      )}

      <Section title={sections.security.title}>
        <ListRow
          label={settingsCopy.recovery.title}
          caption={settingsCopy.recovery.description}
          onPress={() => onOpen("recovery-phrase")}
        />
        <ListRow
          label={settingsCopy.password.title}
          caption={settingsCopy.password.description}
          onPress={() => onOpen("password")}
        />
        <BiometricRow />
        <ListRow label={mobile.lockNow} chevron={false} onPress={lockNow} />
      </Section>

      <Section title={FUNDING_WALLET_SECTION}>
        <FundingWalletRow onPress={() => onOpen("funding-wallet")} />
      </Section>

      <Section title={sections.privacy.title}>
        <ListRow
          label={settingsCopy.protection.title}
          caption={settingsCopy.protection.description}
          onPress={() => onOpen("privacy")}
        />
        <Switch
          label={settingsCopy.analytics.title}
          caption={mobile.analyticsCaption}
          value={analytics}
          onValueChange={(on) => void preferences.setAnalyticsEnabled(on)}
        />
        <ListRow
          label={settingsCopy.risks.title}
          caption={mobile.risksCaption}
          onPress={() => onOpen("risks")}
        />
      </Section>

      <Section title={mobile.aboutSection}>
        <ListRow label={mobile.aboutRow} value={appVersion} onPress={() => onOpen("about")} />
      </Section>

      <Section title={sections.danger.title}>
        <ListRow
          label={settingsCopy.reset.title}
          caption={mobile.resetCaption}
          danger
          onPress={() => onOpen("reset")}
        />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" accessibilityRole="header">
        {title}
      </Text>
      <Panel style={styles.panel}>{children}</Panel>
    </View>
  );
}

type Enabling = { password: string; problem: string | null; busy: boolean };

/**
 * Biometric unlock's switch, shown only where it can work: a device with
 * biometrics enrolled, and a build whose wallet store can hand the vault key
 * to the keystore. Turning it on asks for the password first; turning it off
 * needs neither and deletes the stored key.
 */
function BiometricRow() {
  const { biometric } = useServices();
  const setting = useSyncExternalStore(biometric.subscribe, biometric.setting);
  const [method, setMethod] = useState<BiometricMethod | null>(null);
  const [enabling, setEnabling] = useState<Enabling | null>(null);

  useEffect(() => {
    let current = true;
    void biometric.method().then((found) => current && setMethod(found));
    return () => {
      current = false;
    };
  }, [biometric]);

  if (!method) return null;
  const name = method.name;

  async function turnOn() {
    if (!enabling) return;
    setEnabling({ ...enabling, busy: true, problem: null });
    const result = await biometric.turnOn(enabling.password, mobileUnlockCopy.prompt);
    if (result === "on") {
      successHaptic();
      setEnabling(null);
      return;
    }
    setEnabling({
      password: "",
      busy: false,
      problem:
        result === "wrongPassword" ? mobile.biometric.wrongPassword : mobile.biometric.failed(name),
    });
  }

  const caption = setting === "changed" ? mobile.biometric.changed(name) : mobile.biometric.caption;
  return (
    <View style={styles.biometric}>
      <Switch
        label={mobile.biometric.label(name)}
        caption={enabling ? undefined : caption}
        value={setting === "on" || enabling !== null}
        onValueChange={(on) => {
          if (on) setEnabling({ password: "", problem: null, busy: false });
          else if (enabling) setEnabling(null);
          else void biometric.turnOff();
        }}
      />
      {enabling && (
        <View style={styles.enabling}>
          <Field
            label={mobile.biometric.passwordLabel}
            secure
            value={enabling.password}
            onChangeText={(password) => setEnabling({ ...enabling, password })}
            editable={!enabling.busy}
            error={enabling.problem ?? undefined}
            autoFocus
          />
          <Button
            label={mobile.biometric.turnOn}
            loading={enabling.busy}
            disabled={enabling.password === ""}
            onPress={() => void turnOn()}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: layout.tight },
  panel: { paddingVertical: 0 },
  biometric: { gap: layout.tight, paddingBottom: layout.tight },
  enabling: { gap: layout.tight },
});
