import { mobileSettingsCopy } from "@noirwire/shared/copy";
import { StyleSheet, View } from "react-native";
import { Panel, Screen, Text } from "@/ui";
import { fonts, layout } from "@/ui/theme";

type Block = { title: string; body: string };

function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return blocks.map((block) => (
    <View key={block.title} style={styles.block}>
      <Text accessibilityRole="header" style={styles.title}>
        {block.title}
      </Text>
      <Text tone="dim" style={styles.reading}>
        {block.body}
      </Text>
    </View>
  ));
}

/** Spec 2.34: what can go wrong, stated once. Information, not consent: nothing to accept or dismiss. */
export function RisksScreen() {
  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Blocks blocks={mobileSettingsCopy.risks.sections} />
    </Screen>
  );
}

const privacy = mobileSettingsCopy.privacy;

/** Spec 2.32: what is public, what private funding does, and who can see what. */
export function PrivacyScreen() {
  return (
    <Screen edges={["right", "bottom", "left"]}>
      <Blocks blocks={privacy.sections} />
      <View style={styles.block}>
        <Text accessibilityRole="header" style={styles.title}>
          {privacy.partiesTitle}
        </Text>
        <Panel style={styles.parties}>
          {privacy.parties.map((party) => (
            <View key={party.name} style={styles.party}>
              <Text>{party.name}</Text>
              {party.lines.map((line) => (
                <Text key={line} variant="note">
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </Panel>
      </View>
      <Blocks blocks={[{ title: privacy.phraseTitle, body: privacy.phraseBody }]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: layout.tight },
  title: { fontFamily: fonts.medium },
  reading: { lineHeight: 24 },
  parties: { gap: layout.group },
  party: { gap: layout.hairline },
});
