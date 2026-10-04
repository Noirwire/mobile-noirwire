import { noirwireFeeBps } from "@noirwire/shared/infrastructure";
import { addMoneyView, type AddMoneyAddress } from "@noirwire/shared/presentation";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Panel, Sheet, Text } from "@/ui";
import { fonts, layout } from "@/ui/theme";
import { noteAddressCopied } from "../portfolio/portfolioActions";
import { useWalletSnapshot } from "../network/useWalletSnapshot";
import { useCopied } from "../receive/useCopied";

type AddMoneySheetProps = { onClose: () => void };

/**
 * Bringing money in from outside, as three steps. The person's own funding
 * wallet address sits inside the second, already shown. It is what they give
 * to another service, so this sheet alone may be captured in a screenshot.
 * What it costs opens in place, under the steps, so the address stays on screen.
 */
export function AddMoneySheet({ onClose }: AddMoneySheetProps) {
  const wallet = useWalletSnapshot();
  const view = wallet ? addMoneyView(wallet, { tradeFeeBps: noirwireFeeBps() }) : null;
  const [costsOpen, setCostsOpen] = useState<boolean>(view?.costs.expandedByDefault ?? false);

  return (
    <Sheet open={view !== null} onClose={onClose} title={view?.title ?? ""}>
      {view && (
        <>
          {view.steps.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <Text style={styles.ordinal}>{index + 1}</Text>
              <View style={styles.copy}>
                <Text accessibilityRole="header" style={styles.title}>
                  {step.title}
                </Text>
                <Text variant="note">{step.detail}</Text>
                {step.address && <Address address={step.address} />}
              </View>
            </View>
          ))}
          <Button
            variant="quiet"
            label={view.costs.label}
            aria-expanded={costsOpen}
            onPress={() => setCostsOpen(!costsOpen)}
          />
          {costsOpen &&
            view.costs.lines.map((line) => (
              <Text key={line} variant="note">
                {line}
              </Text>
            ))}
        </>
      )}
    </Sheet>
  );
}

function Address({ address }: { address: AddMoneyAddress }) {
  const clipboard = useCopied(() => noteAddressCopied("funding"));
  return (
    <Panel style={styles.address}>
      <Text selectable accessibilityLabel={address.spoken} style={styles.figures}>
        {address.lines.join("\n")}
      </Text>
      <Text variant="faint">{address.network}</Text>
      <Button
        label={clipboard.copied ? address.copied : address.copy}
        accessibilityLabel={clipboard.copied ? address.copied : address.copyDescribe}
        onPress={() => void clipboard.copy(address.address)}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: "row", gap: layout.inset },
  ordinal: { fontFamily: fonts.medium, fontVariant: ["tabular-nums"] },
  copy: { flex: 1, gap: layout.tight },
  title: { fontFamily: fonts.medium },
  address: { gap: layout.tight, marginTop: layout.tight },
  figures: { fontVariant: ["tabular-nums"], letterSpacing: 0.5 },
});
