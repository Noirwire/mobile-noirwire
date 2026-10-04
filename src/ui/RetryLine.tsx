import { StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { Text } from "./Text";
import { layout, size } from "./theme";

type RetryLineProps = {
  /** What could not be read, already worded. */
  text: string;
  /** The button's label. */
  retry: string;
  /** Absent while offline: the banner says why nothing can be read. */
  onRetry?: () => void;
};

/** One quiet line saying a read failed, with the button that asks again. */
export function RetryLine({ text, retry, onRetry }: RetryLineProps) {
  return (
    <View style={styles.line}>
      <Text variant="faint" accessibilityLiveRegion="polite">
        {text}
      </Text>
      {onRetry && <Button variant="quiet" label={retry} onPress={onRetry} style={styles.button} />}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { gap: layout.tight, alignItems: "flex-start" },
  button: { minHeight: size.minTarget, paddingHorizontal: layout.inset },
});
