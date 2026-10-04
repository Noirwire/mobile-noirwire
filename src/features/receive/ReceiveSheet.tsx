import { getPlatform } from "@noirwire/shared/platform";
import { addressLines, receiveView, spokenAddress } from "@noirwire/shared/presentation";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Notice, QRCode, Sheet, Text } from "@/ui";
import { layout } from "@/ui/theme";
import { noteAddressCopied, noteSheetOpened } from "../portfolio/portfolioActions";
import { useWalletSnapshot } from "../network/useWalletSnapshot";
import { useCopied } from "./useCopied";

type ReceiveSheetProps = {
  portfolioId: string;
  onClose: () => void;
};

/**
 * Spec 2.15: a portfolio's address as text and as a QR code, with the one
 * warning that applies to it. The whole sheet is kept out of screen
 * captures. No Share action: the system share sheet would hand the address
 * to whichever app is picked.
 */
export function ReceiveSheet({ portfolioId, onClose }: ReceiveSheetProps) {
  const wallet = useWalletSnapshot();
  const view = wallet
    ? receiveView({
        wallet,
        target: { kind: "portfolio", id: portfolioId },
        network: getPlatform().env.network,
      })
    : null;
  const clipboard = useCopied(() => {
    if (view?.kind === "address") noteAddressCopied(view.what);
  });
  useEffect(() => noteSheetOpened("receive"), []);

  return (
    <Sheet open={view !== null} onClose={onClose} title={view?.title ?? ""} secure>
      {view?.kind === "unavailable" && <Text tone="dim">{view.message}</Text>}
      {view?.kind === "address" && (
        <View style={styles.body}>
          <Notice tone="warning">{view.notice}</Notice>
          <QRCode value={view.address} label={view.qrLabel} />
          <Text selectable accessibilityLabel={spokenAddress(view.address)} style={styles.address}>
            {addressLines(view.address).join("\n")}
          </Text>
          <Button
            label={clipboard.copied ? view.copied : view.copy}
            onPress={() => void clipboard.copy(view.address)}
          />
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
  address: { textAlign: "center", fontVariant: ["tabular-nums"], letterSpacing: 0.5 },
});
