import { getPlatform } from "@noirwire/shared/platform";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Notice, Panel, QRCode, Sheet, Text } from "@/ui";
import { layout } from "@/ui/theme";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { noteAddressCopied, noteSheetOpened } from "../portfolio/portfolioActions";
import { useWalletSnapshot } from "../portfolio/useWalletSnapshot";
import { addressLines, spokenAddress } from "./addressGroups";
import { receiveView, type ReceiveTarget } from "./receiveView";
import { useCopied } from "./useCopied";

type ReceiveSheetProps = {
  target: ReceiveTarget;
  onClose: () => void;
};

/**
 * Spec 2.15: one address as text and as a QR code, with the one warning that
 * applies to it. Kept out of screen captures while the address shows. No
 * Share action: the system share sheet would hand the address to whichever
 * app is picked.
 */
export function ReceiveSheet({ target, onClose }: ReceiveSheetProps) {
  const wallet = useWalletSnapshot();
  const [revealed, setRevealed] = useState(false);
  const view = wallet ? receiveView(wallet, target, getPlatform().env.network) : null;
  const shown = view?.kind === "address" && (view.masked === null || revealed);
  const clipboard = useCopied(() => {
    if (view?.kind === "address") noteAddressCopied(view.what);
  });
  useCaptureProtection(shown);
  useEffect(() => noteSheetOpened("receive"), []);

  return (
    <Sheet open={view !== null} onClose={onClose} title={view?.title ?? ""}>
      {view?.kind === "unavailable" && <Text tone="dim">{view.message}</Text>}
      {view?.kind === "address" && (
        <View style={styles.body}>
          <Notice tone="warning">{view.notice}</Notice>
          {!shown && view.masked ? (
            <Panel style={styles.masked}>
              <Text>{view.masked.text}</Text>
              <Button label={view.masked.show} onPress={() => setRevealed(true)} />
            </Panel>
          ) : (
            <>
              <QRCode value={view.address} label={view.qrLabel} />
              <Text
                selectable
                accessibilityLabel={spokenAddress(view.address)}
                style={styles.address}
              >
                {addressLines(view.address).join("\n")}
              </Text>
              <Button
                label={clipboard.copied ? view.copied : view.copy}
                onPress={() => void clipboard.copy(view.address)}
              />
            </>
          )}
          {view.notes.map((note) => (
            <Text key={note} variant="faint">
              {note}
            </Text>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout.group },
  masked: { gap: layout.group },
  address: { textAlign: "center", fontVariant: ["tabular-nums"], letterSpacing: 0.5 },
});
