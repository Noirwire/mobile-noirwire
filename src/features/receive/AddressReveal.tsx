import { addressLines, spokenAddress } from "@noirwire/shared/presentation";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Row, Text } from "@/ui";
import { layout } from "@/ui/theme";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { useCopied } from "./useCopied";

export type AddressRevealCopy = {
  /** The row's label: "Address", "Sent to". */
  label: string;
  /** What the row reads while the address is held back. */
  hidden: string;
  show: string;
  hide: string;
  copy: string;
  copied: string;
  showLabel: string;
  hideLabel: string;
  copyLabel: string;
};

type AddressRevealProps = {
  address: string;
  copy: AddressRevealCopy;
  onCopied?: () => void;
};

/**
 * An address held back behind "Show". Shown, it reads in groups of four over
 * two lines, kept out of screen captures, with Copy and Hide beneath. It is
 * hidden again whenever the component leaves the screen, so a lock, a closed
 * sheet or Back never leave it showing.
 */
export function AddressReveal({ address, copy, onCopied }: AddressRevealProps) {
  const [shown, setShown] = useState(false);
  const clipboard = useCopied(onCopied);
  useCaptureProtection(shown);

  if (!shown) {
    return (
      <View style={styles.hiddenRow}>
        <View style={styles.flex}>
          <Row label={copy.label} value={copy.hidden} last />
        </View>
        <Button
          variant="quiet"
          label={copy.show}
          accessibilityLabel={copy.showLabel}
          onPress={() => setShown(true)}
        />
      </View>
    );
  }

  const [first, second] = addressLines(address);
  return (
    <View style={styles.shown}>
      <Text variant="label">{copy.label}</Text>
      <Text selectable accessibilityLabel={spokenAddress(address)} style={styles.address}>
        {`${first}\n${second}`}
      </Text>
      <View style={styles.actions}>
        <Button
          variant="quiet"
          label={clipboard.copied ? copy.copied : copy.copy}
          accessibilityLabel={clipboard.copied ? copy.copied : copy.copyLabel}
          onPress={() => void clipboard.copy(address)}
          style={styles.action}
        />
        <Button
          variant="quiet"
          label={copy.hide}
          accessibilityLabel={copy.hideLabel}
          onPress={() => setShown(false)}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenRow: { flexDirection: "row", alignItems: "center", gap: layout.tight },
  flex: { flex: 1 },
  shown: { gap: layout.tight, paddingVertical: layout.tight },
  address: { fontVariant: ["tabular-nums"], letterSpacing: 0.5 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  action: { flexGrow: 1 },
});
