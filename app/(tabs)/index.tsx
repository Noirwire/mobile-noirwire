import { appCopy } from "@noirwire/shared/copy";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { StyleSheet, View } from "react-native";
import { lockNow } from "@/features/wallet/walletActions";
import { EmptyState, IconButton, Mark, Screen, Text } from "@/ui";
import { colors, layout, size } from "@/ui/theme";

export default function Home() {
  return (
    <Screen>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Mark size={22} />
          <Text>{appCopy.name}</Text>
        </View>
        <IconButton label={appCopy.nav.lock} onPress={lockNow}>
          <LockIcon size={size.icon} color={colors.ink} />
        </IconButton>
      </View>
      <EmptyState
        title="Nothing here yet"
        detail="Your portfolios and what they are worth will appear here."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: layout.tight },
});
