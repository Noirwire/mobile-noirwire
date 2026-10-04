import { commonCopy, mobileSendCopy, sendCopy } from "@noirwire/shared/copy";
import { resolvePortfolioIcon, symbolAmount } from "@noirwire/shared/domain";
import {
  maxAmountText,
  sendFormView,
  sendProgressView,
  sendResultView,
  sendReviewView,
} from "@noirwire/shared/presentation";
import { QrCodeIcon } from "phosphor-react-native/src/icons/QrCode";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  Acknowledge,
  Button,
  Chip,
  EmptyState,
  Field,
  IconButton,
  Notice,
  Panel,
  Row,
  Scanner,
  Sheet,
  StepList,
  StillWorking,
  Text,
} from "@/ui";
import { ActingFor } from "@/ui/ActingFor";
import { confirmHaptic } from "@/ui/confirmHaptic";
import { errorHaptic, lightHaptic, successHaptic, warningHaptic } from "@/ui/haptics";
import { Terms } from "@/ui/Terms";
import { colors, fonts, layout, size } from "@/ui/theme";
import { ActionOverdue } from "../network/ActionOverdue";
import { OfflineBanner } from "../network/OfflineBanner";
import { PendingNote } from "../network/PendingNote";
import { useSendFlow, type SendFlow } from "./useSendFlow";

const copy = { ...sendCopy, ...mobileSendCopy };

type SendScreenProps = {
  portfolioId: string;
  onClose: () => void;
  /** Closes this sheet and opens fund for this portfolio. */
  onMoveMoney: (portfolioId: string) => void;
};

/** Spec 2.24: send cash or a tracker from one portfolio to an address. */
export function SendScreen({ portfolioId, onClose, onMoveMoney }: SendScreenProps) {
  const flow = useSendFlow(portfolioId);
  const { step, portfolio } = flow;
  const name = portfolio?.label ?? "";

  const form = sendFormView({
    platform: "mobile",
    offCurveMessage: sendCopy.unsendable.offCurve,
    submitting: false,
    network: "",
    draft: flow.draft,
    symbol: flow.symbol,
    heldRaw: flow.heldRaw,
    unitsPerHeld: flow.units,
    decimals: flow.decimals,
    destination: flow.destination,
    ownAddress: flow.ownAddress,
    offCurve: flow.offCurve,
    recipientTouched: flow.recipientTouched,
    amountTouched: flow.amountTouched,
    archived: portfolio?.archivedAt !== null,
    preparing: flow.preparing,
    online: flow.online,
    pastedForeign: flow.pastedForeign,
    unsendable: flow.unsendable,
    recipientUnreadable: flow.recipientUnreadable,
  });
  const review =
    flow.review &&
    sendReviewView({
      platform: "mobile",
      submitting: false,
      network: "",
      solFee: 0,
      draft: flow.draft,
      canReview: flow.draft.validRecipient && flow.draft.validAmount,
      symbol: flow.symbol,
      unitsPerHeld: flow.units,
      destination: flow.destination,
      sendAmount: flow.review.amount,
      cost: flow.review.cost,
      pricePerHeld: flow.pricePerHeld,
      recipient: flow.classification,
      checks: flow.checks,
      pending: flow.pending,
      online: flow.online,
    });
  const amountShown = symbolAmount(flow.symbol, (flow.review?.amount ?? 0) * (flow.units ?? 1));

  const danger = Boolean(review && (review.linkWarning || review.lookalike));
  useEffect(() => {
    if (step === "review" && danger) warningHaptic();
  }, [step, danger]);
  const refused = form.refusal !== null;
  useEffect(() => {
    if (refused) errorHaptic();
  }, [refused]);
  const ended = flow.outcome?.kind;
  useEffect(() => {
    if (ended === "landed") successHaptic();
    else if (ended === "unknown") warningHaptic();
  }, [ended]);

  const title = {
    details: copy.title(name),
    scan: copy.scanTitle,
    review: copy.reviewTitle,
    progress: sendProgressView(flow.stage, amountShown).title,
    result: copy.title(name),
  }[step];
  const onBack = step === "scan" || step === "review" ? () => flow.goTo("details") : undefined;

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      onBack={onBack}
      dirty={(flow.recipient !== "" || flow.amountText !== "") && step !== "result"}
      busy={step === "progress" && !flow.working.overdue}
      secure
      footer={<Footer flow={flow} form={form} review={review} onClose={onClose} />}
    >
      {step !== "result" && <OfflineBanner />}
      {portfolio && step !== "result" && step !== "scan" && (
        <ActingFor name={name} {...resolvePortfolioIcon(portfolio.icon)} />
      )}
      {step === "details" && <DetailsStep flow={flow} form={form} onClose={onClose} />}
      {step === "scan" && <ScanStep flow={flow} />}
      {step === "review" && review && (
        <ReviewStep flow={flow} view={review} onMoveMoney={() => onMoveMoney(portfolioId)} />
      )}
      {step === "progress" && (
        <>
          <StepList steps={sendProgressView(flow.stage, amountShown).steps} />
          {!flow.working.overdue && <StillWorking waiting={flow.working} />}
          <ActionOverdue waiting={flow.working} />
        </>
      )}
      {step === "result" && flow.outcome && (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <Text variant="display">
            {sendResultView(flow.outcome.kind, amountShown, name).title}
          </Text>
          <Text tone="dim">
            {sendResultView(flow.outcome.kind, amountShown, name, flow.outcome.balancesUnread).body}
          </Text>
        </View>
      )}
    </Sheet>
  );
}

function DetailsStep({
  flow,
  form,
  onClose,
}: {
  flow: SendFlow;
  form: ReturnType<typeof sendFormView>;
  onClose: () => void;
}) {
  if (flow.assets.length === 0) {
    return (
      <EmptyState
        title={copy.empty}
        detail={copy.emptyDetail}
        action={<Button label={commonCopy.close} variant="quiet" onPress={onClose} />}
      />
    );
  }
  return (
    <>
      <View style={styles.chips}>
        {flow.assets.map((asset) => (
          <Chip
            key={asset.symbol}
            label={asset.label}
            active={asset.symbol === flow.symbol}
            onPress={() => flow.chooseAsset(asset.symbol)}
          />
        ))}
      </View>
      <View style={styles.group}>
        <Field
          label={form.recipientLabel}
          placeholder={form.recipientPlaceholder}
          value={flow.recipient}
          onChangeText={flow.setRecipient}
          onBlur={flow.touchRecipient}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={2}
          error={form.recipientError ?? undefined}
        />
        <View style={styles.inline}>
          <Button label={copy.paste} variant="quiet" onPress={() => void flow.paste()} />
          <IconButton label={copy.scan} onPress={() => flow.goTo("scan")}>
            <QrCodeIcon size={size.icon} color={colors.ink} />
          </IconButton>
        </View>
        {form.pasteWarning && (
          <Text variant="note" tone="warning" accessibilityRole="alert">
            {form.pasteWarning}
          </Text>
        )}
        {flow.scanNotice && <Notice>{copy.addressOnly}</Notice>}
      </View>
      {form.refusal && <Notice tone="danger">{form.refusal}</Notice>}
      <View style={styles.group}>
        <Field
          label={form.amountLabel}
          placeholder={form.amountPlaceholder}
          keyboardType="decimal-pad"
          value={flow.amountText}
          onChangeText={flow.setAmountText}
          onBlur={flow.touchAmount}
          error={form.amountError ?? undefined}
        />
        <View style={styles.inline}>
          <Button
            label={commonCopy.max}
            variant="quiet"
            onPress={() => {
              flow.setAmountText(maxAmountText(flow.draft));
              flow.touchAmount();
            }}
          />
        </View>
      </View>
      {flow.prepareFailure && <Notice tone="danger">{flow.prepareFailure}</Notice>}
      <Row label={form.available.label} value={form.available.value} last />
      {form.balanceUnavailable && <Notice tone="warning">{form.balanceUnavailable}</Notice>}
      <Text variant="faint">{form.explainer}</Text>
    </>
  );
}

function ScanStep({ flow }: { flow: SendFlow }) {
  return (
    <>
      <Scanner
        hint={copy.scanHint}
        onRead={(text) => {
          if (flow.scanned(text)) lightHaptic();
        }}
      />
      {flow.scanRefused && (
        <Text variant="note" tone="danger" accessibilityRole="alert">
          {copy.notAnAddress}
        </Text>
      )}
    </>
  );
}

function ReviewStep({
  flow,
  view,
  onMoveMoney,
}: {
  flow: SendFlow;
  view: NonNullable<ReturnType<typeof sendReviewView>>;
  onMoveMoney: () => void;
}) {
  const setCheck = (patch: Partial<SendFlow["checks"]>) =>
    flow.setChecks({ ...flow.checks, ...patch });
  return (
    <>
      <View style={styles.group}>
        <Text variant="faint">{view.recipient.label}</Text>
        <Panel accessibilityLabel={view.recipient.aria} accessible>
          <Text style={styles.address}>
            {view.segments.map((segment, index) => (
              <Text
                key={index}
                tone={segment.strong ? "ink-strong" : "dim"}
                style={segment.strong ? styles.strong : undefined}
              >
                {segment.text}
              </Text>
            ))}
          </Text>
        </Panel>
      </View>
      <Terms terms={view.terms} />
      {view.cashNote && <Notice tone="warning">{view.cashNote}</Notice>}
      {view.costReason.map((line) => (
        <Text key={line} variant="faint">
          {line}
        </Text>
      ))}
      {flow.reviewNotice && <Notice tone="warning">{flow.reviewNotice}</Notice>}
      {flow.failure && <Notice tone="danger">{flow.failure}</Notice>}
      {view.costNotNow && <Notice tone="warning">{view.costNotNow}</Notice>}
      {view.needsCash && (
        <View style={styles.group}>
          <Notice tone="warning">{view.needsCash.text}</Notice>
          <Button label={view.needsCash.action} variant="quiet" onPress={onMoveMoney} />
        </View>
      )}
      {view.linkWarning && (
        <>
          <Notice tone="danger" title={view.linkWarning.title}>
            {view.linkWarning.body}
          </Notice>
          <Acknowledge
            label={view.linkWarning.accept}
            checked={flow.checks.acceptedLink}
            onChange={(acceptedLink) => setCheck({ acceptedLink })}
          />
        </>
      )}
      {view.lookalike && (
        <>
          <Notice tone="danger" title={view.lookalike.title}>
            {`${view.lookalike.previous}${view.lookalike.address}\n${view.lookalike.check}`}
          </Notice>
          <Acknowledge
            label={view.lookalike.confirm}
            checked={flow.checks.checkedAddress}
            onChange={(checkedAddress) => setCheck({ checkedAddress })}
          />
        </>
      )}
      {view.firstTime && <Notice tone="warning">{view.firstTime}</Notice>}
      {view.lastFour && (
        <Field
          label={view.lastFour.label}
          accessibilityLabel={view.lastFour.aria}
          value={flow.checks.lastFour}
          onChangeText={(text) => setCheck({ lastFour: text.trim() })}
          maxLength={4}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
      <PendingNote pending={flow.pending} />
      <Text variant="note" tone="warning">
        {view.irreversible}
      </Text>
      {view.reason && <Text variant="note">{view.reason}</Text>}
    </>
  );
}

function Footer({
  flow,
  form,
  review,
  onClose,
}: {
  flow: SendFlow;
  form: ReturnType<typeof sendFormView>;
  review: ReturnType<typeof sendReviewView> | null;
  onClose: () => void;
}) {
  switch (flow.step) {
    case "details":
      return flow.assets.length === 0 ? null : (
        <Button
          label={form.review.label}
          loading={flow.preparing}
          loadingLabel={form.review.label}
          waitingFor="review"
          disabled={form.review.disabled}
          onPress={() => void flow.openReview()}
        />
      );
    case "review":
      return review ? (
        <Button
          label={review.confirm.label}
          disabled={review.confirm.disabled}
          onPress={() => {
            confirmHaptic();
            void flow.confirm();
          }}
        />
      ) : null;
    case "progress":
      return flow.working.overdue ? (
        <Button label={commonCopy.close} variant="quiet" onPress={onClose} />
      ) : null;
    case "result":
      return flow.outcome ? (
        <Button label={sendResultView(flow.outcome.kind, "", "").close} onPress={onClose} />
      ) : null;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  group: { gap: layout.tight },
  inline: { flexDirection: "row", alignItems: "center", gap: layout.tight },
  address: { fontVariant: ["tabular-nums"], lineHeight: 24 },
  strong: { fontFamily: fonts.medium },
  result: { gap: layout.group },
});
