import { StyleSheet, View } from "react-native";
import { colors } from "./theme";

export function Divider() {
  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  rule: { height: 1, alignSelf: "stretch", backgroundColor: colors["line-subtle"] },
});
