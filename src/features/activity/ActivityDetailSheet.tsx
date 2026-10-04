import { activityCopy, mobileActivityCopy } from "@noirwire/shared/copy";
import { activityDetailView } from "@noirwire/shared/presentation";
import { screenReads } from "@noirwire/shared/wallet";
import { Pressable, StyleSheet, View } from "react-native";
import { IdentityMark, Row, Sheet, Text } from "@/ui";
import { layout, opacity } from "@/ui/theme";
import { AddressReveal } from "../receive/AddressReveal";
import { useWalletSnapshot } from "../portfolio/useWalletSnapshot";

const copy = { ...activityCopy.detail, ...mobileActivityCopy.detail };

type ActivityDetailSheetProps = {
  /** The entry to show; null keeps the sheet closed. */
  entryId: string | null;
  onClose: () => void;
  /** Closes the sheet and opens the portfolio the entry belongs to. */
  onOpenPortfolio: (id: string) => void;
};

/**
 * Spec 2.28: everything this phone recorded about one entry. A send's
 * recipient is held back until "Show", and is hidden again when the sheet
 * closes. The sheet closes on its own when the wallet locks, because a locked
 * wallet has no entries to show.
 */
export function ActivityDetailSheet({
  entryId,
  onClose,
  onOpenPortfolio,
}: ActivityDetailSheetProps) {
  const wallet = useWalletSnapshot();
  const view = wallet && entryId ? activityDetailView(screenReads, wallet, entryId) : null;

  return (
    <Sheet open={view !== null} onClose={onClose} title={view?.title ?? ""} secure>
      {view && (
        <>
          <Text variant="display" tone={view.headlineTone} style={styles.figure}>
            {view.headline}
          </Text>
          <View>
            {view.portfolio ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.portfolio}, ${view.portfolio.name}`}
                accessibilityHint={copy.openPortfolio(view.portfolio.name)}
                onPress={() => {
                  const id = view.portfolio!.id;
                  onClose();
                  onOpenPortfolio(id);
                }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Row
                  label={copy.portfolio}
                  value={
                    <View style={styles.portfolio}>
                      <IdentityMark
                        glyph={view.portfolio.icon.glyph}
                        tint={view.portfolio.icon.tint}
                        size="sm"
                      />
                      <Text numberOfLines={1} style={styles.shrink}>
                        {view.portfolio.name}
                      </Text>
                    </View>
                  }
                />
              </Pressable>
            ) : (
              <Row label={copy.portfolio} value={view.portfolioFallback} />
            )}
            <Row label={copy.date} value={view.date} />
            <Row label={copy.amount} value={view.amount} />
            <Row label={copy.valueAtTime} value={view.value} last={view.recipient === null} />
            {view.recipient !== null && (
              <AddressReveal
                address={view.recipient}
                copy={{
                  label: copy.sentTo,
                  hidden: copy.addressYouEntered,
                  show: copy.show,
                  hide: copy.hide,
                  copy: copy.copy,
                  copied: copy.copied,
                  showLabel: copy.showAddress,
                  hideLabel: copy.hideAddress,
                  copyLabel: copy.copyAddress,
                }}
              />
            )}
          </View>
          <Text variant="faint">{copy.recorded}</Text>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  figure: { fontVariant: ["tabular-nums"] },
  pressed: { opacity: opacity.pressed },
  portfolio: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.tight,
    flexShrink: 1,
  },
  shrink: { flexShrink: 1 },
});
