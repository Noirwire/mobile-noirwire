import { StyleSheet, View } from "react-native";
import { Button, EmptyState, Screen } from "@/ui";
import { layout } from "@/ui/theme";

type LookAroundScreenProps = { onCreate: () => void };

/**
 * Spec 2.2, for now: the visitor's read-only Markets, without a watchlist or
 * a trade form, and one way forward. The tracker list and prices come with
 * the Markets screen itself.
 */
export function LookAroundScreen({ onCreate }: LookAroundScreenProps) {
  return (
    <Screen edges={["right", "bottom", "left"]}>
      <View style={styles.body}>
        <EmptyState
          title="Trackers are coming here"
          detail="Companies and funds you can invest in will be listed here with their prices, to browse before you have a wallet."
        />
      </View>
      <Button label="Create a wallet to invest" onPress={onCreate} />
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { flexGrow: 1, gap: layout.group } });
