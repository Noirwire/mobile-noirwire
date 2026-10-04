import { portfolioNameTaken } from "@noirwire/shared/application";
import { errorsCopy } from "@noirwire/shared/copy";
import type { Portfolio, Wallet } from "@noirwire/shared/domain";
import {
  NAME_MAX,
  draftChanged,
  portfolioSettingsView,
  settingsDraft,
  type SettingsDraft,
} from "@noirwire/shared/presentation";
import { screenReads } from "@noirwire/shared/wallet";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Divider, Field, Notice, Sheet, Text } from "@/ui";
import { lightHaptic } from "@/ui/haptics";
import { fonts, layout } from "@/ui/theme";
import { IconPicker } from "./IconPicker";
import { IdentityLine } from "./IdentityLine";
import { savePortfolioSettings, setArchived } from "./portfolioActions";
import { useWalletSnapshot } from "../network/useWalletSnapshot";

type PortfolioSettingsSheetProps = {
  portfolioId: string;
  open: boolean;
  onClose: () => void;
  pricesUpdatedAt: number | null;
};

/**
 * Spec 2.17: rename a portfolio, change its mark, or archive it. Nothing here
 * touches the network. A draft lives only while the sheet is open; closing
 * it, or a lock, discards it.
 */
export function PortfolioSettingsSheet(props: PortfolioSettingsSheetProps) {
  const wallet = useWalletSnapshot();
  const portfolio = wallet?.portfolios.find((entry) => entry.id === props.portfolioId);
  if (!props.open || !portfolio || !wallet) return null;
  return <OpenSettings {...props} portfolio={portfolio} wallet={wallet} />;
}

function OpenSettings({
  portfolio,
  wallet,
  onClose,
  pricesUpdatedAt,
}: PortfolioSettingsSheetProps & { portfolio: Portfolio; wallet: Wallet }) {
  const [draft, setDraft] = useState<SettingsDraft>(() => settingsDraft(portfolio));
  const view = portfolioSettingsView(screenReads, portfolio, draft, pricesUpdatedAt);

  /** A name another portfolio has, archived ones included, is refused here as it is on creation. */
  const nameTaken = portfolioNameTaken(wallet, draft.name.trim(), portfolio.id);

  function save() {
    if (nameTaken) return;
    lightHaptic();
    void savePortfolioSettings(portfolio.id, draft.name, draft.icon);
    onClose();
  }

  function toggleArchived() {
    lightHaptic();
    void setArchived(portfolio.id, !view.archived);
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={view.title} dirty={draftChanged(portfolio, draft)}>
      <IdentityLine tint={draft.icon.tint} />
      <Field
        label={view.nameLabel}
        value={draft.name}
        maxLength={NAME_MAX}
        onChangeText={(name) => setDraft({ ...draft, name })}
        autoCapitalize="sentences"
        error={nameTaken ? errorsCopy.duplicateName : undefined}
      />
      <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
      <Button label={view.save} disabled={!view.canSave || nameTaken} onPress={save} />
      <Divider />
      <View style={styles.archive}>
        <Text style={styles.title}>{view.sectionTitle}</Text>
        <Text variant="note">{view.sectionLead}</Text>
      </View>
      {view.stillHolds && <Notice>{view.stillHolds}</Notice>}
      <Button variant="quiet" label={view.toggle} onPress={toggleArchived} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  archive: { gap: layout.hairline },
  title: { fontFamily: fonts.medium },
});
