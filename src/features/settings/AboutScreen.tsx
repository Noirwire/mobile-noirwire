import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ListRow, Mark, Panel, Screen, Text } from "@/ui";
import { lightHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { mobileSettingsCopy } from "./copy";

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
        <Text variant="h2">NoirWire</Text>
      </View>
      <Panel style={styles.panel}>
        <ListRow
          label={copy.version}
          value={copied ? copy.copied : version}
          onLongPress={copyVersion}
        />
        <ListRow label={copy.build} value={build} />
        <ListRow label={copy.network} value={copy.networkValue} />
        <ListRow label={copy.risks} onPress={onOpenRisks} />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: layout.inset },
  panel: { paddingVertical: 0 },
});
