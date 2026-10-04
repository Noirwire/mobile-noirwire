import { canCreatePortfolio, portfolioNameTaken } from "@noirwire/shared/application";
import { errorsCopy, mobilePortfolioCopy, portfolioCopy } from "@noirwire/shared/copy";
import {
  DEFAULT_PORTFOLIO_GLYPH,
  DEFAULT_PORTFOLIO_TINT,
  mixFrom,
  type Mix,
  type PortfolioIcon,
} from "@noirwire/shared/domain";
import {
  NAME_MAX,
  NEW_KINDS,
  newPortfolioView,
  pieMixView,
  type NewKind,
} from "@noirwire/shared/presentation";
import { FUNDING_DERIVATION_INDEX } from "@noirwire/shared/infrastructure";
import { screenReads } from "@noirwire/shared/wallet";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Chip, Field, Notice, PieRing, Segmented, Sheet, Shelf, Text } from "@/ui";
import { selectionHaptic, successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { PieMixEditor } from "../pie/PieBuilderSheet";
import { IconPicker } from "./IconPicker";
import { addPortfolio, noteSheetOpened } from "./portfolioActions";
import { useWalletSnapshot } from "./useWalletSnapshot";

type NewPortfolioSheetProps = {
  onClose: () => void;
  /** Called with the new portfolio's id once it is stored; the sheet has closed by then. */
  onCreated: (id: string) => void;
};

const DEFAULT_ICON: PortfolioIcon = {
  glyph: DEFAULT_PORTFOLIO_GLYPH,
  tint: DEFAULT_PORTFOLIO_TINT,
};
const PIE_MARK = 40;

/**
 * Spec 2.14: a portfolio, or a pie, with a name only the user sees. Nothing
 * goes on chain and nothing is priced, so it works offline. The button can
 * always be pressed and says what is missing; a name another portfolio has is
 * refused as it is typed; and a wallet that already ends in a run of
 * never-used portfolios is told to use one of those first, since one made
 * past them could be out of an import's reach.
 */
export function NewPortfolioSheet({ onClose, onCreated }: NewPortfolioSheetProps) {
  const [kind, setKind] = useState<NewKind>("portfolio");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<PortfolioIcon>(DEFAULT_ICON);
  const [iconChosen, setIconChosen] = useState(false);
  const [mix, setMix] = useState<Mix>(() => mixFrom([]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Create was pressed: what is missing is said. */
  const [asked, setAsked] = useState(false);
  const wallet = useWalletSnapshot();
  useEffect(() => noteSheetOpened("new_account"), []);

  const pie = kind === "pie";
  const mixProblem = pieMixView(screenReads, mix).problem;
  const view = newPortfolioView({ kind, name, mixProblem, platform: "mobile" });
  const labelToKind = new Map(NEW_KINDS.map((option) => [view.kindLabels[option], option]));

  const tooManyUnused = wallet !== null && !canCreatePortfolio(wallet, FUNDING_DERIVATION_INDEX);
  const nameProblem =
    wallet !== null && portfolioNameTaken(wallet, name.trim())
      ? errorsCopy.duplicateName
      : asked && name.trim() === ""
        ? mobilePortfolioCopy.create.nameNeeded
        : undefined;

  async function create() {
    setAsked(true);
    if (!view.canSubmit || nameProblem !== undefined || tooManyUnused) return;
    setBusy(true);
    setError(null);
    const result = await addPortfolio({
      label: name,
      icon: pie && !iconChosen ? undefined : icon,
      pie: pie ? mix.slices : undefined,
    });
    if ("error" in result) {
      setBusy(false);
      setError(result.error);
      return;
    }
    successHaptic();
    onClose();
    onCreated(result.portfolio.id);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={view.title}
      dirty={name.length > 0 || mix.slices.length > 0 || iconChosen}
      busy={busy}
      footer={
        <Button
          label={view.submit}
          loading={busy}
          loadingLabel={view.submitting}
          disabled={tooManyUnused}
          onPress={() => void create()}
        />
      }
    >
      {tooManyUnused && <Notice tone="warning">{errorsCopy.unusedPortfolios}</Notice>}
      <View style={styles.group}>
        <Segmented
          label={view.kindsLabel}
          options={NEW_KINDS.map((option) => view.kindLabels[option])}
          value={view.kindLabels[kind]}
          onChange={(label) => setKind(labelToKind.get(label) ?? "portfolio")}
        />
        <Text variant="faint">{view.description}</Text>
      </View>
      <Text tone="dim">{view.lead}</Text>
      <Field
        label={view.nameLabel}
        placeholder={mobilePortfolioCopy.create.forExample(view.placeholder)}
        value={name}
        maxLength={NAME_MAX}
        onChangeText={setName}
        autoCapitalize="sentences"
        error={nameProblem}
      />
      {view.suggestions.length > 0 && (
        <Shelf gap={layout.tight}>
          {view.suggestions.map((suggestion) => (
            <Chip
              key={suggestion}
              label={suggestion}
              active={name === suggestion}
              onPress={() => {
                selectionHaptic();
                setName(suggestion);
              }}
            />
          ))}
        </Shelf>
      )}
      <IconPicker
        value={icon}
        onChange={(next) => {
          setIcon(next);
          setIconChosen(true);
        }}
        leading={
          pie && !iconChosen ? (
            <PieRing
              target={
                mix.slices.length > 0 ? mix.slices.map((slice) => Math.max(slice.weight, 1)) : [100]
              }
              label={mobilePortfolioCopy.icon.pieRingMark}
              size={PIE_MARK}
              thickness={5}
            />
          ) : undefined
        }
        reset={
          pie && iconChosen
            ? { label: portfolioCopy.icon.usePieRing, onPress: () => setIconChosen(false) }
            : undefined
        }
      />
      {pie && <PieMixEditor mix={mix} onChange={setMix} />}
      {pie && asked && mixProblem && <Notice tone="warning">{mixProblem}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: layout.tight },
});
