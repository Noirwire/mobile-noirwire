import { appCopy, mobileSettingsCopy } from "@noirwire/shared/copy";
import { networkLabel } from "@noirwire/shared/infrastructure";
import { aboutView } from "@noirwire/shared/presentation";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ListRow, Mark, Panel, Screen, Text } from "@/ui";
import { lightHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";

type AboutScreenProps = {
  version: string;
  build: string;
  onOpenRisks: () => void;
};

const copy = mobileSettingsCopy.about;
const COPIED_MS = 2_000;

/** Spec 2.33: what version this is. A long press on Version copies the version and build for support. */
export function AboutScreen({ version, build, onOpenRisks }: AboutScreenProps) {
  const [copied, setCopied] = useState(false);
  const view = aboutView();

  function copyVersion() {
    void Clipboard.setStringAsync(`${version} (${build})`);
    lightHaptic();
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <View style={styles.brand}>
        <Mark size={40} />
        <Text variant="h2">{appCopy.name}</Text>
      </View>
      <Text tone="dim">{view.beta}</Text>
      <Panel style={styles.panel}>
        <ListRow
          label={copy.version}
          value={copied ? copy.copied : version}
          onLongPress={copyVersion}
        />
        <ListRow label={copy.build} value={build} />
        <ListRow label={copy.network} value={networkLabel()} />
        {[view.help, view.website].map((link) => (
          <ListRow
            key={link.action.kind}
            label={link.label}
            value={link.value}
            link
            onPress={() => void Linking.openURL(link.action.url).catch(() => undefined)}
          />
        ))}
        <ListRow label={copy.risks} onPress={onOpenRisks} />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  panel: { paddingVertical: 0 },
});
