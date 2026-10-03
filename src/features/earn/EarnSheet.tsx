import { resolvePortfolioIcon, type PortfolioIcon } from "@noirwire/shared/domain";
import type { EarnPosition } from "@noirwire/shared/infrastructure";
import {
  earnAmountView,
  earnChoiceView,
  earnMaxText,
  earnProgressView,
  earnResultView,
  earnReviewView,
  type EarnPortfolio,
} from "@noirwire/shared/presentation";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Field, Notice, Row, Sheet, StepList, Text } from "@/ui";
import { ActingFor } from "@/ui/ActingFor";
import { confirmHaptic } from "@/ui/confirmHaptic";
import { errorHaptic, successHaptic, warningHaptic } from "@/ui/haptics";
import { PortfolioChoice } from "@/ui/PortfolioChoice";
import { Terms } from "@/ui/Terms";
import { layout } from "@/ui/theme";
import { OfflineBanner } from "../network/OfflineBanner";
import { PendingNote } from "../network/PendingNote";
import { mobileSettingsCopy } from "../settings/copy";
import { useEarnFlow, type EarnFlow, type EarnOpening } from "./useEarnFlow";

type EarnSheetProps = {
  opening: EarnOpening;
  portfolios: readonly EarnPortfolio[];
  icons: Record<string, PortfolioIcon | undefined>;
  positionOf: (id: string) => EarnPosition | null;
  venue: string;
  apy: number | undefined;
  onClose: () => void;
  /** Closes the sheet and opens fund for this portfolio. */
  onMoveMoney: (portfolioId: string) => void;
};

/** Spec 2.27: lend a portfolio's cash, or bring it back. */
export function EarnSheet(props: EarnSheetProps) {
  const flow = useEarnFlow(props.opening, props.portfolios, props.positionOf);
  const { step, portfolio, action } = flow;
  const label = portfolio?.label ?? "";

  const ended = flow.result?.outcome;
  useEffect(() => {
    if (ended === "landed") successHaptic();
    else if (ended === "unknown") warningHaptic();
  }, [ended]);
  const failed = flow.failure !== null;
  useEffect(() => {
    if (failed) errorHaptic();
  }, [failed]);

  const choice = earnChoiceView(action, props.portfolios, flow.chosen);
  const amount = earnAmountView({
    action,
    draft: flow.draft,
    portfolioLabel: label,
    amountText: flow.amountText,
    cost: flow.cost,
    apy: props.apy,
    online: flow.online,
  });
  const review =
    flow.cost &&
    earnReviewView({
      action,
      amount: flow.draft.amount,
      portfolioLabel: label,
      cost: flow.cost,
      venue: props.venue,
      pending: flow.pending,
      online: flow.online,
    });
  const progress = earnProgressView(action, flow.draft.amount);

  const title = {
    choose: choice.title,
    amount: choice.title,
    review: review?.title ?? choice.title,
    risks: mobileSettingsCopy.risks.title,
    progress: progress.title,
    result: choice.title,
  }[step];
  const onBack =
    step === "review"
      ? () => flow.goTo("amount")
      : step === "risks"
        ? () => flow.goTo("review")
        : step === "amount" && !props.opening.portfolioId
          ? () => flow.goTo("choose")
          : undefined;

  return (
    <Sheet
      open
      onClose={props.onClose}
      title={title}
      onBack={onBack}
      dirty={flow.amountText !== "" && (step === "amount" || step === "review" || step === "risks")}
      busy={step === "progress"}
      footer={
        <Footer
          flow={flow}
          choice={choice}
          amount={amount}
          review={review}
          onClose={props.onClose}
        />
      }
    >
      {step !== "result" && <OfflineBanner />}
      {step === "choose" && (
        <View accessibilityRole="radiogroup" style={styles.list}>
          {choice.rows.map((row) => (
            <PortfolioChoice
              key={row.id}
              name={row.label}
              detail={row.detail}
              {...resolvePortfolioIcon(props.icons[row.id])}
              selected={flow.chosen === row.id}
              onSelect={() => flow.choose(row.id)}
            />
          ))}
        </View>
      )}
      {portfolio && (step === "amount" || step === "review") && (
        <ActingFor name={label} {...resolvePortfolioIcon(props.icons[portfolio.id])} />
      )}
      {step === "amount" && (
        <>
          <Text tone="dim">{amount.lead}</Text>
          <Field
            label={amount.amountLabel}
            placeholder={amount.placeholder}
            keyboardType="decimal-pad"
            value={flow.amountText}
            onChangeText={flow.setAmountText}
            error={amount.validation ?? undefined}
          />
          <View style={styles.inline}>
            <Button
              label={amount.max}
              variant="quiet"
              disabled={flow.cost === null}
              onPress={() => flow.setAmountText(earnMaxText(flow.draft))}
            />
          </View>
          <Row label={amount.available.label} value={amount.available.value} last />
          {amount.estimate && <Text variant="note">{amount.estimate}</Text>}
        </>
      )}
      {step === "review" && review && (
        <>
          <Terms terms={review.terms} total={review.total} />
          {review.reasons.map((line) => (
            <Text key={line} variant="faint">
              {line}
            </Text>
          ))}
          {review.notNow && <Notice tone="warning">{review.notNow}</Notice>}
          {review.needsCash && portfolio && (
            <View style={styles.list}>
              <Notice tone="warning">{review.needsCash.text}</Notice>
              <Button
                label={review.needsCash.action}
                variant="quiet"
                onPress={() => props.onMoveMoney(portfolio.id)}
              />
            </View>
          )}
          {flow.failure && <Notice tone="danger">{flow.failure}</Notice>}
          {review.risk && (
            <View style={styles.list}>
              <Text variant="note">{review.risk.line}</Text>
              <View style={styles.inline}>
                <Button
                  label={review.risk.link}
                  variant="quiet"
                  onPress={() => flow.goTo("risks")}
                />
              </View>
            </View>
          )}
          <PendingNote pending={flow.pending} />
        </>
      )}
      {step === "risks" &&
        mobileSettingsCopy.risks.sections.map((section) => (
          <View key={section.title} style={styles.list}>
            <Text variant="label" accessibilityRole="header">
              {section.title}
            </Text>
            <Text tone="dim">{section.body}</Text>
          </View>
        ))}
      {step === "progress" && <StepList steps={progress.steps} />}
      {step === "result" && flow.result && (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <Text variant="display">
            {earnResultView({ ...flow.result, action, portfolioLabel: label }).title}
          </Text>
          <Text tone="dim">
            {earnResultView({ ...flow.result, action, portfolioLabel: label }).body}
          </Text>
        </View>
      )}
    </Sheet>
  );
}

function Footer({
  flow,
  choice,
  amount,
  review,
  onClose,
}: {
  flow: EarnFlow;
  choice: ReturnType<typeof earnChoiceView>;
  amount: ReturnType<typeof earnAmountView>;
  review: ReturnType<typeof earnReviewView> | null;
  onClose: () => void;
}) {
  switch (flow.step) {
    case "choose":
      return (
        <Button
          label={choice.next.label}
          disabled={choice.next.disabled}
          onPress={() => flow.goTo("amount")}
        />
      );
    case "amount":
      return (
        <Button
          label={amount.review.label}
          disabled={amount.review.disabled}
          onPress={() => flow.goTo("review")}
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
    case "result":
      return flow.result ? (
        <Button
          label={earnResultView({ ...flow.result, action: flow.action, portfolioLabel: "" }).close}
          onPress={onClose}
        />
      ) : null;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  list: { gap: layout.tight },
  inline: { flexDirection: "row", alignItems: "center" },
  result: { gap: layout.group },
});
