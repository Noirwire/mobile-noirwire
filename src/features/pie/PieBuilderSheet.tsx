import { pieCopy } from "@noirwire/shared/copy";
import { resolvePortfolioIcon } from "@noirwire/shared/domain";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Button, IconButton, Notice, PieRing, Sheet, Stepper, Text } from "@/ui";
import { selectionHaptic, successHaptic } from "@/ui/haptics";
import { colors, fonts, layout, size } from "@/ui/theme";
import { TrackerMark } from "@/ui/TrackerMark";
import { useWalletSnapshot } from "../markets/useMarketData";
import { IdentityLine, TrackerChooser } from "../trade/parts";
import { mobilePieCopy } from "./copy";
import { changeMix, mixFrom, mixView, type Mix, type MixChange } from "./pieMix";
import { savePieMix } from "./pieActions";

const RING = 88;
/** At large text sizes the Stepper moves under the name. */
const STACK_FONT_SCALE = 1.3;

/**
 * Items 2 to 6 of spec 2.23: the ring and total, one row per tracker, the
 * chooser and the problem line. New pie embeds this as its body.
 */
export function PieMixEditor({ mix, onChange }: { mix: Mix; onChange: (next: Mix) => void }) {
  const view = mixView(mix);
  const { fontScale } = useWindowDimensions();
  const change = (next: MixChange) => onChange(changeMix(mix, next));
  return (
    <>
      <View style={styles.summary}>
        <PieRing target={view.ring.target} label={view.ring.label} size={RING} thickness={8}>
          <Text style={styles.medium}>{view.count}</Text>
        </PieRing>
        <View style={styles.grow}>
          <View accessibilityLiveRegion="polite" accessibilityLabel={view.total.spoken}>
            <Text style={styles.medium} tone={view.total.warning ? "warning" : "ink"}>
              {view.total.text}
            </Text>
            <Text variant="faint">{view.total.caption}</Text>
          </View>
          {view.splitEvenly && (
            <Button
              variant="quiet"
              label={view.splitEvenly}
              onPress={() => {
                selectionHaptic();
                change({ type: "splitEvenly" });
              }}
              style={styles.link}
            />
          )}
        </View>
      </View>
      {view.rows.map((row) => (
        <View key={row.symbol} style={[styles.row, fontScale > STACK_FONT_SCALE && styles.stacked]}>
          <View style={styles.name}>
            <TrackerMark symbol={row.symbol} size="sm" />
            <View style={styles.grow}>
              <Text numberOfLines={1}>{row.name}</Text>
              <Text variant="faint">{row.symbol}</Text>
            </View>
          </View>
          <View style={styles.controls}>
            <Stepper
              label={row.stepLabel}
              value={row.weight}
              step={view.step}
              onChange={(weight) => change({ type: "set", symbol: row.symbol, weight })}
            />
            <IconButton
              label={row.removeLabel}
              onPress={() => change({ type: "remove", symbol: row.symbol })}
            >
              <XIcon size={size.iconSmall} color={colors.dim} />
            </IconButton>
          </View>
        </View>
      ))}
      {view.chooser && (
        <TrackerChooser
          key={view.count}
          label={view.chooser.label}
          exclude={view.rows.map((row) => row.symbol)}
          onChoose={(symbol) => change({ type: "add", symbol })}
        />
      )}
      {view.problem && (
        <Text variant="note" tone="warning">
          {view.problem}
        </Text>
      )}
    </>
  );
}

type PieBuilderSheetProps = { portfolioId: string; onClose: () => void };

/** Spec 2.23: "Edit mix" on a pie. Saving moves nothing. */
export function PieBuilderSheet({ portfolioId, onClose }: PieBuilderSheetProps) {
  const wallet = useWalletSnapshot();
  const portfolio = wallet?.portfolios.find((entry) => entry.id === portfolioId);
  const [mix, setMix] = useState(() => mixFrom(portfolio?.pie));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const view = mixView(mix);
  const edit = pieCopy.edit;
  const tint = resolvePortfolioIcon(portfolio?.icon).tint;

  async function save() {
    setSaving(true);
    setFailed(false);
    const stored = await savePieMix(portfolioId, mix.slices);
    setSaving(false);
    if (!stored) return setFailed(true);
    successHaptic();
    onClose();
  }

  return (
    <Sheet
      open
      title={edit.title}
      onClose={onClose}
      dirty={dirty}
      busy={saving}
      footer={
        <Button
          label={edit.save}
          loading={saving}
          loadingLabel={edit.saving}
          disabled={view.problem !== null || !portfolio}
          onPress={() => void save()}
        />
      }
    >
      <IdentityLine tint={tint} />
      <Text tone="dim">{edit.lead}</Text>
      <PieMixEditor
        mix={mix}
        onChange={(next) => {
          setDirty(true);
          setMix(next);
        }}
      />
      {failed && <Notice tone="danger">{mobilePieCopy.builder.saveFailed}</Notice>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: layout.group },
  grow: { flex: 1, minWidth: 0 },
  medium: { fontFamily: fonts.medium },
  link: { alignSelf: "flex-start", paddingHorizontal: 0 },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: layout.tight },
  stacked: { flexDirection: "column", alignItems: "stretch" },
  name: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: layout.tight },
  controls: { flexDirection: "row", alignItems: "center", gap: layout.hairline },
});
