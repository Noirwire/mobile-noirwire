import { onboardingCopy } from "@noirwire/shared/copy";
import { StyleSheet, View } from "react-native";
import { Button, Mark, Screen, Text } from "@/ui";
import { layout } from "@/ui/theme";
import { mobileOnboardingCopy } from "./copy";

type WelcomeScreenProps = {
  onCreate: () => void;
  onImport: () => void;
  onLookAround: () => void;
  /** Development builds only: the UI kit gallery. */
  onOpenKit?: () => void;
};

const copy = onboardingCopy.welcome;

/** Spec 2.1: what NoirWire is in one line, and the ways in. */
export function WelcomeScreen({ onCreate, onImport, onLookAround, onOpenKit }: WelcomeScreenProps) {
  return (
    <Screen>
      <View style={styles.brand}>
        <Mark size={28} />
        <Text variant="label">{copy.brand}</Text>
      </View>
      <View style={styles.intro}>
        <Text variant="display" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text tone="dim">{copy.lead}</Text>
      </View>
      <View style={styles.actions}>
        <Button label={copy.create} onPress={onCreate} />
        <Button label={copy.import} variant="quiet" onPress={onImport} />
        <Button label={copy.lookAround} variant="quiet" onPress={onLookAround} />
        {onOpenKit && <Button label="Open the UI kit" variant="quiet" onPress={onOpenKit} />}
      </View>
      <Text variant="faint">{mobileOnboardingCopy.welcome.trust}</Text>
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
