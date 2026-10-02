import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Mark, Screen, Text } from "@/ui";
import { layout } from "@/ui/theme";

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.intro}>
        <Mark size={48} title="NoirWire" />
        <Text variant="h1">Private portfolios, held by you.</Text>
        <Text variant="lead">
          Your keys stay on this device. Onboarding is not built yet: the steps below open, and each
          one is still empty.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Create a wallet" onPress={() => router.push("/create")} />
        <Button label="Import a wallet" variant="quiet" onPress={() => router.push("/import")} />
        {__DEV__ && (
          <Button label="Open the UI kit" variant="quiet" onPress={() => router.push("/dev/ui")} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexGrow: 1, justifyContent: "center", gap: layout.group },
  actions: { gap: layout.tight },
});
