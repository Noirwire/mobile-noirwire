import { resolvePortfolioIcon } from "@noirwire/shared/domain";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  EmptyState,
  Field,
  Notice,
  Row,
  Sheet,
  Skeleton,
  StepList,
  Text,
} from "@/ui";
import { ActingFor } from "@/ui/ActingFor";
import { confirmHaptic } from "@/ui/confirmHaptic";
import { successHaptic, warningHaptic } from "@/ui/haptics";
import { PortfolioChoice } from "@/ui/PortfolioChoice";
import { PresetChip } from "@/ui/PresetChip";
import { Terms } from "@/ui/Terms";
import { layout } from "@/ui/theme";
import { OfflineBanner } from "../network/OfflineBanner";
import { mobileFundingCopy as copy } from "./copy";
import {
  choosePortfolioView,
  fundAmountView,
  fundOutcomeView,
  fundProgressView,
  fundReviewView,
} from "./fundingView";
import { useFundFlow, type FundFlow } from "./useFundFlow";

type FundScreenProps = {
  /** The portfolio to fund, or null to choose one inside the sheet. */
  portfolioId: string | null;
  onClose: () => void;
  /** Closes this sheet and opens Receive for the funding wallet. */
  onShowFundingAddress: () => void;
  /** Closes this sheet and opens the portfolio's public view. */
  onSeePublicView: (portfolioId: string) => void;
};

/** Spec 2.16: move USDC from the funding wallet into one portfolio by the private route. */
export function FundScreen({
  portfolioId,
  onClose,
  onShowFundingAddress,
  onSeePublicView,
}: FundScreenProps) {
  const flow = useFundFlow(portfolioId);
  const { step, portfolio } = flow;
  const label = portfolio?.label ?? "";

  const outcome = flow.result?.outcome;
  useEffect(() => {
    if (outcome === "done") successHaptic();
    else if (outcome) warningHaptic();
  }, [outcome]);

  const amount = fundAmountView({
    draft: flow.draft,
    portfolioLabel: label,
    fundingBalance: flow.fundingBalance,
    amountText: flow.amountText,
    online: flow.online,
    pending: flow.pending,
  });
  const review = fundReviewView({
    draft: flow.draft,
    amount: flow.draft.customAmount,
    portfolioLabel: label,
    online: flow.online,
    pending: flow.pending,
  });

  const title = {
    choose: copy.chooseTitle,
    amount: copy.title,
    review: review.title,
    progress: fundProgressView({
      amount: flow.draft.customAmount,
      portfolioLabel: label,
      completed: flow.completed,
      slow: flow.slow,
    }).title,
    result: copy.title,
  }[step];

  const onBack =
    step === "review"
      ? () => flow.goTo("amount")
      : step === "amount" && flow.needsChoice
        ? () => flow.goTo("choose")
        : undefined;

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      onBack={onBack}
      dirty={flow.amountText !== "" && (step === "amount" || step === "review")}
      busy={step === "progress"}
      footer={<Footer flow={flow} amountView={amount} reviewView={review} onClose={onClose} />}
    >
      {step !== "result" && <OfflineBanner />}
      {step === "choose" && <ChooseStep flow={flow} />}
      {step !== "choose" && portfolio && step !== "result" && (
        <ActingFor name={portfolio.label} {...resolvePortfolioIcon(portfolio.icon)} />
      )}
      {step === "amount" && (
        <AmountStep flow={flow} view={amount} onShowFundingAddress={onShowFundingAddress} />
      )}
      {step === "review" && (
        <>
          <Text tone="dim">{review.lead}</Text>
          <Terms
            terms={review.terms}
            total={{ ...review.total, announcement: review.totalAnnouncement }}
          />
          <Text variant="faint">{review.notSignedAbove}</Text>
          {flow.pending.note && <Notice tone="warning">{flow.pending.note}</Notice>}
        </>
      )}
      {step === "progress" && <ProgressStep flow={flow} label={label} />}
      {step === "result" && flow.result && (
        <ResultStep
          flow={flow}
          label={label}
          onSeePublicView={() => portfolio && onSeePublicView(portfolio.id)}
        />
      )}
    </Sheet>
  );
}

function ChooseStep({ flow }: { flow: FundFlow }) {
  const view = choosePortfolioView({ portfolios: flow.portfolios, chosen: flow.chosen });
  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {view.rows.map((row, index) => (
        <PortfolioChoice
          key={row.id}
          name={row.label}
          detail={row.cash}
          {...resolvePortfolioIcon(flow.portfolios[index].icon)}
          selected={flow.chosen === row.id}
          onSelect={() => flow.choose(row.id)}
        />
      ))}
    </View>
  );
}

function AmountStep({
  flow,
  view,
  onShowFundingAddress,
}: {
  flow: FundFlow;
  view: ReturnType<typeof fundAmountView>;
  onShowFundingAddress: () => void;
}) {
  return (
    <>
      <Text tone="dim">{view.lead}</Text>
      <Row
        label={view.available.label}
        value={
          view.available.value === null ? (
            <Skeleton width={96} />
          ) : (
            <Text style={styles.figure}>{view.available.value}</Text>
          )
        }
        last
      />
      {view.empty ? (
        <EmptyState
          title={view.empty.title}
          detail={view.empty.detail}
          action={<Button label={view.empty.action} onPress={onShowFundingAddress} />}
        />
      ) : (
        <>
          <Field
            label={view.amountLabel}
            placeholder={view.placeholder}
            keyboardType="decimal-pad"
            value={flow.amountText}
            onChangeText={flow.setAmountText}
            error={view.validation ?? undefined}
          />
          <View style={styles.presets}>
            {view.presets.map((preset) => (
              <PresetChip
                key={preset.value}
                label={preset.label}
                disabled={preset.disabled}
                onPress={() => flow.setAmountText(String(preset.value))}
              />
            ))}
          </View>
          <Terms terms={view.terms} total={view.total} />
          {flow.pending.note && <Notice tone="warning">{flow.pending.note}</Notice>}
          {flow.failure && <Notice tone="danger">{flow.failure}</Notice>}
          <Text variant="faint">{view.costs}</Text>
          <Divider />
          <Text variant="faint">{view.footer}</Text>
        </>
      )}
    </>
  );
}

function ProgressStep({ flow, label }: { flow: FundFlow; label: string }) {
  const view = fundProgressView({
    amount: flow.draft.customAmount,
    portfolioLabel: label,
    completed: flow.completed,
    slow: flow.slow,
  });
  return (
    <>
      <StepList steps={view.steps} />
      {view.stillWorking && <Text variant="faint">{view.stillWorking}</Text>}
    </>
  );
}

function ResultStep({
  flow,
  label,
  onSeePublicView,
}: {
  flow: FundFlow;
  label: string;
  onSeePublicView: () => void;
}) {
  if (!flow.result) return null;
  const view = fundOutcomeView({ ...flow.result, portfolioLabel: label });
  return (
    <View style={styles.result} accessibilityLiveRegion="polite">
      <Text variant="display">{view.title}</Text>
      <Text tone="dim">{view.body}</Text>
      {view.publicView && (
        <Button label={view.publicView} variant="quiet" onPress={onSeePublicView} />
      )}
    </View>
  );
}

function Footer({
  flow,
  amountView,
  reviewView,
  onClose,
}: {
  flow: FundFlow;
  amountView: ReturnType<typeof fundAmountView>;
  reviewView: ReturnType<typeof fundReviewView>;
  onClose: () => void;
}) {
  switch (flow.step) {
    case "choose": {
      const view = choosePortfolioView({ portfolios: flow.portfolios, chosen: flow.chosen });
      return (
        <Button
          label={view.next.label}
          disabled={view.next.disabled}
          onPress={() => flow.goTo("amount")}
        />
      );
    }
    case "amount":
      return amountView.empty ? null : (
        <Button
          label={amountView.review.label}
          disabled={amountView.review.disabled}
          onPress={() => flow.goTo("review")}
        />
      );
    case "review":
      return (
        <Button
          label={reviewView.confirm.label}
          disabled={reviewView.confirm.disabled}
          onPress={() => {
            confirmHaptic();
            void flow.confirm();
          }}
        />
      );
    case "progress":
      return null;
    case "result":
      return flow.result ? (
        <Button
          label={fundOutcomeView({ ...flow.result, portfolioLabel: "" }).close}
          onPress={onClose}
        />
      ) : null;
  }
}

const styles = StyleSheet.create({
  list: { gap: layout.tight },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  figure: { fontVariant: ["tabular-nums"] },
  result: { gap: layout.group },
});
