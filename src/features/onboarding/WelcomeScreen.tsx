import { welcomeView, type WelcomeAction } from "@noirwire/shared/presentation";
import { StyleSheet, View } from "react-native";
import { Button, Mark, Screen, Text } from "@/ui";
import { layout } from "@/ui/theme";

type WelcomeScreenProps = {
  onAction: (kind: WelcomeAction["kind"]) => void;
};

/** Spec 2.1: what NoirWire is for, the three ways in, and the one line about who holds the wallet. */
export function WelcomeScreen({ onAction }: WelcomeScreenProps) {
  const view = welcomeView("mobile");
  return (
    <Screen>
      <View style={styles.brand}>
        <Mark size={28} />
        <Text variant="label">{view.brand}</Text>
      </View>
      <View style={styles.intro}>
        <Text variant="display" accessibilityRole="header">
          {view.title}
        </Text>
        {view.lines.map((line) => (
          <Text key={line} tone="dim">
            {line}
          </Text>
        ))}
      </View>
      <View style={styles.actions}>
        {view.actions.map((action) => (
          <Button
            key={action.kind}
            label={action.label}
            variant={action.filled ? "primary" : "quiet"}
            onPress={() => onAction(action.kind)}
          />
        ))}
      </View>
      <Text variant="faint">{view.trust}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.tight,
    marginTop: layout.section,
  },
  intro: { gap: layout.group },
  actions: { gap: layout.tight },
});
