import { commonCopy, mobileWalletCopy } from "@noirwire/shared/copy";
import { StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { Notice } from "./Notice";
import { layout } from "./theme";
import type { CaptureProtection } from "./useCaptureProtection";

/** What is said where a secret is held back because it could not be kept out of screen captures. */
export const protectionCopy = {
  refused: mobileWalletCopy.protection.refused,
  tryAgain: commonCopy.tryAgain,
} as const;

/** Stands where the secret would be when the system refused to protect it. Nothing otherwise. */
export function ProtectionRefused({ protection }: { protection: CaptureProtection }) {
  if (!protection.refused) return null;
  return (
    <View style={styles.refused}>
      <Notice tone="warning">{protectionCopy.refused}</Notice>
      <Button variant="quiet" label={protectionCopy.tryAgain} onPress={protection.retry} />
    </View>
  );
}

const styles = StyleSheet.create({ refused: { gap: layout.tight } });
