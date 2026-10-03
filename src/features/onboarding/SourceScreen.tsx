import type { ImportResolution } from "@noirwire/shared/infrastructure";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, ChoicePanel, Screen, Text } from "@/ui";
import { layout } from "@/ui/theme";
import { mobileOnboardingCopy } from "@noirwire/shared/copy";
import { importSourceView, type ImportSourceChoice } from "@noirwire/shared/presentation";

type SourceScreenProps = {
  resolution: ImportResolution;
  initialChoice: ImportSourceChoice | null;
  onOpen: (choice: ImportSourceChoice) => void;
};

const copy = mobileOnboardingCopy.source;

/** Spec 2.6: which set of addresses to open, asked as where the phrase came from. Never an address. */
export function SourceScreen({ resolution, initialChoice, onOpen }: SourceScreenProps) {
  const view = useMemo(() => importSourceView(resolution), [resolution]);
  const [choice, setChoice] = useState<ImportSourceChoice | null>(
    initialChoice ?? view.preselected,
  );

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <View style={styles.intro}>
        <Text variant="display" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text tone="dim">{copy.intro}</Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {view.options.map((option) => (
          <ChoicePanel
            key={option.choice}
            title={option.title}
            captions={option.captions}
            selected={choice === option.choice}
            onSelect={() => setChoice(option.choice)}
          />
        ))}
      </View>
      <Button
        label={copy.open}
        disabled={choice === null}
        onPress={() => choice && onOpen(choice)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  options: { gap: layout.inset },
});
