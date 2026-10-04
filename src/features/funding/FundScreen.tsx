import { commonCopy, fundingCopy, mobileFundingCopy as copy } from "@noirwire/shared/copy";
import { resolvePortfolioIcon } from "@noirwire/shared/domain";
import {
  FUND_PRESETS,
  choosePortfolioView,
  fundingAmountView,
  fundingOutcomeView,
  fundingProgressView,
  fundingReviewView,
  type FundingAmountView,
  type FundingReviewView,
  type StageStatus,
} from "@noirwire/shared/presentation";
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
  useTopLoader,
  WaitingPlaceholder,
  type StepStatus,
} from "@/ui";
import { ActingFor } from "@/ui/ActingFor";
import { confirmHaptic } from "@/ui/confirmHaptic";
import { successHaptic, warningHaptic } from "@/ui/haptics";
import { PortfolioChoice } from "@/ui/PortfolioChoice";
import { PresetChip } from "@/ui/PresetChip";
import { RetryLine } from "@/ui/RetryLine";
import { Terms } from "@/ui/Terms";
import { layout } from "@/ui/theme";
import { ActionOverdue } from "../network/ActionOverdue";
import { OfflineBanner } from "../network/OfflineBanner";
import { PendingNote } from "../network/PendingNote";
import { CASH, useFundFlow, type FundFlow } from "./useFundFlow";

const STEP_STATUS: Record<StageStatus, StepStatus> = {
  pending: "waiting",
  running: "current",
  done: "done",
};

const progressOf = (flow: FundFlow, label: string) =>
  fundingProgressView({
    asset: CASH,
    amount: flow.draft.customAmount,
    portfolioLabel: label,
    completed: flow.completed,
    platform: "mobile",
    slow: flow.working.stillWorking !== null,
  });

const outcomeOf = (result: NonNullable<FundFlow["result"]>, label: string) =>
  fundingOutcomeView({
    ...result,
    asset: CASH,
    privateRoute: true,
    portfolioLabel: label,
    platform: "mobile",
  });

type FundScreenProps = {
  /** The portfolio to fund, or null to choose one inside the sheet. */
  portfolioId: string | null;
  onClose: () => void;
  /** Closes this sheet and opens the add-money sheet. */
  onAddMoney: () => void;
  /** Closes this sheet and opens the portfolio's public view. */
  onSeePublicView: (portfolioId: string) => void;
};

/** Spec 2.16: move USDC from the funding wallet into one portfolio with a private move. */
export function FundScreen({ portfolioId, onClose, onAddMoney, onSeePublicView }: FundScreenProps) {
  const flow = useFundFlow(portfolioId);
  const { step, portfolio } = flow;
  const label = portfolio?.label ?? "";
  useTopLoader(flow.stillReading);

  const outcome = flow.result?.outcome;
  useEffect(() => {
    if (outcome === "done") successHaptic();
    else if (outcome) warningHaptic();
  }, [outcome]);

  const amount = fundingAmountView({
    draft: flow.draft,
    asset: CASH,
    privateRoute: true,
    fundingBalance: flow.fundingBalance,
    readFailed: flow.readFailed,
    amountText: flow.amountText,
    touched: flow.touched,
    decimals: flow.decimals,
    presets: FUND_PRESETS,
    pending: flow.pending,
    platform: "mobile",
    portfolioLabel: label,
    online: flow.online,
  });
  const review = fundingReviewView({
    draft: flow.draft,
    asset: CASH,
    amount: flow.draft.customAmount,
    portfolioLabel: label,
    pending: flow.pending,
    platform: "mobile",
    online: flow.online,
  });

  const title = {
    choose: copy.chooseTitle,
    amount: fundingCopy.titlePrivate,
    review: review.title,
    progress: progressOf(flow, label).title,
    result: fundingCopy.titlePrivate,
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
      busy={step === "progress" && !flow.working.overdue}
      footer={<Footer flow={flow} amountView={amount} reviewView={review} onClose={onClose} />}
    >
      {step !== "result" && <OfflineBanner />}
      {step === "choose" && <ChooseStep flow={flow} />}
      {step !== "choose" && portfolio && step !== "result" && (
        <ActingFor name={portfolio.label} {...resolvePortfolioIcon(portfolio.icon)} />
      )}
      {step === "amount" && <AmountStep flow={flow} view={amount} onAddMoney={onAddMoney} />}
      {step === "review" && (
        <>
          <Text tone="dim">{review.lead}</Text>
          <Terms
            terms={review.terms}
            total={{ ...review.total, announcement: review.totalSpoken }}
          />
          <Text variant="faint">{review.note}</Text>
          <PendingNote pending={flow.pending} />
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
  const view = choosePortfolioView({
    portfolios: flow.portfolios,
    chosen: flow.chosen,
    balances: flow.balances,
  });
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
  onAddMoney,
}: {
  flow: FundFlow;
  view: FundingAmountView;
  onAddMoney: () => void;
}) {
  return (
    <>
      <Text tone="dim">{view.lead}</Text>
      <Row
        label={view.available.label}
        value={
          view.available.value === null ? (
            view.unavailable === null && (
              <WaitingPlaceholder waiting={{ ...flow.reading, stillWorking: null }}>
                <Skeleton width={96} />
              </WaitingPlaceholder>
            )
          ) : (
            <Text style={styles.figure}>{view.available.value}</Text>
          )
        }
        last
      />
      {view.unavailable && (
        <RetryLine
          text={view.unavailable.text}
          retry={view.unavailable.retry}
          onRetry={flow.online ? flow.retryRead : undefined}
        />
      )}
      {view.emptyNotice ? (
        <EmptyState
          title={view.emptyNotice.title}
          detail={view.emptyNotice.detail}
          action={<Button label={view.emptyNotice.action} onPress={onAddMoney} />}
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
          <PendingNote pending={flow.pending} />
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
  const view = progressOf(flow, label);
  return (
    <>
      <StepList
        steps={view.stages.map((stage, index) => ({
          key: String(index),
          title: stage.title,
          caption: stage.detail,
          status: STEP_STATUS[stage.status],
        }))}
      />
      {view.stillWorking && !flow.working.overdue && (
        <Text variant="faint">{view.stillWorking}</Text>
      )}
      <ActionOverdue waiting={flow.working} />
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
  const view = outcomeOf(flow.result, label);
  return (
    <View style={styles.result} accessibilityLiveRegion="polite">
      <Text variant="display">{view.title}</Text>
      <Text tone="dim">{view.body}</Text>
      {view.observerLink && (
        <Button label={view.observerLink} variant="quiet" onPress={onSeePublicView} />
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
  amountView: FundingAmountView;
  reviewView: FundingReviewView;
  onClose: () => void;
}) {
  switch (flow.step) {
    case "choose": {
      const view = choosePortfolioView({
        portfolios: flow.portfolios,
        chosen: flow.chosen,
        balances: flow.balances,
      });
      return (
        <Button
          label={view.next.label}
          disabled={view.next.disabled}
          onPress={() => flow.goTo("amount")}
        />
      );
    }
    case "amount":
      return amountView.emptyNotice ? null : (
        <Button
          label={amountView.next.label}
          disabled={amountView.next.disabled}
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
      return flow.working.overdue ? (
        <Button label={commonCopy.close} variant="quiet" onPress={onClose} />
      ) : null;
    case "result":
      return flow.result ? (
        <Button label={outcomeOf(flow.result, "").close} onPress={onClose} />
      ) : null;
  }
}

const styles = StyleSheet.create({
  list: { gap: layout.tight },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
  figure: { fontVariant: ["tabular-nums"] },
  result: { gap: layout.group },
});
