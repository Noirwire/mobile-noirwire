import { runLegs, type Attempt, type LegOutcome } from "@noirwire/shared/application";
import { commonCopy, errorsCopy, mobilePieCopy, pieCopy } from "@noirwire/shared/copy";
import {
  investFloor,
  planInvest,
  rebalanceSells,
  resolvePortfolioIcon,
  typedAmount,
  type Leg,
  type NetworkCost,
  type Side,
} from "@noirwire/shared/domain";
import type { TradePlan } from "@noirwire/shared/infrastructure";
import {
  chainErrorMessage,
  describeFailure,
  investFloorView,
  pieApprovalView,
  pieInvestView,
  pieLegSteps,
  pieProgressHeadline,
  pieRebalanceView,
  pieResultHeadline,
  pieReviewView,
  pieRunStopped,
  rebalanceNote,
  type PieOrder,
} from "@noirwire/shared/presentation";
import {
  asset,
  cashOf,
  getSnapshot,
  piePriced,
  pieSlices,
  shownUnits,
} from "@noirwire/shared/wallet";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  EmptyState,
  Notice,
  Panel,
  Row,
  Sheet,
  StepList,
  StillWorking,
  Text,
  useTopLoader,
  useWaiting,
  withinLimit,
  WAITING_LIMIT_MS,
} from "@/ui";
import { errorHaptic, heavyHaptic, lightHaptic, successHaptic, warningHaptic } from "@/ui/haptics";
import { colors, fonts, layout } from "@/ui/theme";
import { useLivePrices, useWalletSnapshot } from "../markets/useMarketData";
import { ActionOverdue } from "../network/ActionOverdue";
import { PendingNote } from "../network/PendingNote";
import { usePendingBlock } from "../network/usePendingBlock";
import { useServices } from "../services";
import { AmountField, IdentityLine, RiskSections } from "../trade/parts";
import { useTrading } from "../trade/useTrading";

export type PieOrderMode = "invest" | "rebalance";

type PieOrderSheetProps = {
  portfolioId: string;
  mode: PieOrderMode;
  onClose: () => void;
  onAddMoney: (portfolioId: string) => void;
};

type Step = "input" | "review" | "risks" | "progress" | "result";

type Priced = {
  side: Side;
  legs: Leg[];
  orders: TradePlan[];
  cost: NetworkCost;
  leftover: number;
};

type Approval = {
  view: ReturnType<typeof pieApprovalView>;
  answer: (accepted: boolean) => void;
};

const copy = pieCopy.order;
const nameOf = (symbol: string) => asset(symbol)?.name ?? symbol;
const symbolOf = (order: TradePlan): PieOrder => ({ ...order, symbol: order.stock.symbol });

/** Spec 2.21: invest in a pie's mix, or bring a drifted pie back to it, as a reviewed set of orders. */
export function PieOrderSheet({ portfolioId, mode, onClose, onAddMoney }: PieOrderSheetProps) {
  const service = useTrading();
  const online = useServices().useOnline();
  const wallet = useWalletSnapshot();
  const updatedAt = useLivePrices();
  const pending = usePendingBlock(portfolioId);
  const portfolio = wallet?.portfolios.find((entry) => entry.id === portfolioId) ?? null;

  const [step, setStep] = useState<Step>("input");
  const [amountText, setAmountText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [priced, setPriced] = useState<Priced | null>(null);
  const [outcomes, setOutcomes] = useState<LegOutcome[]>([]);
  const [covering, setCovering] = useState(false);
  const [opened, setOpened] = useState(false);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [runningSide, setRunningSide] = useState<Side>(mode === "invest" ? "buy" : "sell");
  const [closing, setClosing] = useState<string | null>(null);
  const [pricingNow, setPricingNow] = useState(false);
  const pricingWait = useWaiting(pricingNow, "review");
  useTopLoader(pricingNow);
  // Each order gets the action's limit, and a question waiting for an answer is not a wait.
  const working = useWaiting(step === "progress" && approval === null, "action", {
    limitMs: WAITING_LIMIT_MS.action * Math.max(outcomes.length, 1),
  });

  const title = portfolio
    ? mode === "invest"
      ? copy.investTitle(portfolio.label)
      : copy.rebalanceTitle(portfolio.label)
    : "";
  if (!portfolio || !portfolio.pie) {
    return (
      <Sheet open title={title} onClose={onClose}>
        <EmptyState title={pieCopy.edit.title} detail={pieCopy.problems.empty} />
      </Sheet>
    );
  }

  const tint = resolvePortfolioIcon(portfolio.icon).tint;
  const smallest = service.smallestOrderUsd();
  const cash = cashOf(portfolio);
  const slices = pieSlices(portfolio);
  const isPriced = piePriced(portfolio, updatedAt);
  const amount = typedAmount(amountText);
  const preview = planInvest(amount, slices);
  const invest = pieInvestView({ amount, cash, preview, priced: isPriced, nameOf });
  const floor = investFloorView(isPriced ? investFloor(amount, slices, smallest) : null);
  const rebalancing = rebalanceSells(slices, smallest);
  const leftAlone = rebalanceNote(rebalancing.leftAlone);
  const rebalance = pieRebalanceView({ sells: rebalancing.sells, priced: isPriced, nameOf });
  const tradable = service.available();

  async function price(side: Side, legs: Leg[], offered: number) {
    setNotice(null);
    setPricingNow(true);
    const orders: TradePlan[] = [];
    for (const leg of legs) {
      const quoted = await withinLimit(
        service.quote(portfolioId, side, leg.symbol, leg.amount),
        WAITING_LIMIT_MS.review,
      ).catch(() => ({ error: errorsCopy.trade.noPrice }));
      if ("error" in quoted) {
        setNotice(copy.legFailed(leg.symbol, quoted.error));
        setPricingNow(false);
        return setStep("input");
      }
      orders.push(quoted.plan);
    }
    try {
      const reviewed = await withinLimit(
        service.reviewCost(portfolioId, orders, false),
        WAITING_LIMIT_MS.review,
      );
      const spent = side === "buy" ? legs.reduce((sum, leg) => sum + leg.usd, 0) : 0;
      setPriced({
        side,
        legs,
        orders,
        cost: reviewed.cost,
        leftover: side === "buy" ? Math.max(offered - spent, 0) : 0,
      });
      setPricingNow(false);
      setStep("review");
    } catch {
      setNotice(copy.costCheckFailed);
      setPricingNow(false);
      setStep("input");
    }
  }

  async function submit(
    plan: TradePlan,
  ): Promise<{ ok: true; unconfirmed?: boolean } | { error: string }> {
    const result = await service
      .place(portfolioId, plan, {})
      // Thrown past the use case's own answers: whether it was placed is not known.
      .catch((): Attempt<TradePlan> => ({ kind: "unknown", completed: [] }));
    if (result.kind === "confirmed") {
      lightHaptic();
      return result.settlement === "balancesEstimated"
        ? { ok: true, unconfirmed: true }
        : { ok: true };
    }
    if (result.kind === "unknown") return { error: chainErrorMessage("outcomeUnknown") };
    return { error: describeFailure(result, "mobile").error };
  }

  function finish(final: LegOutcome[], closingLine: string | null) {
    setOutcomes(final);
    setClosing(closingLine);
    if (pieRunStopped(final)) warningHaptic();
    else successHaptic();
    setStep("result");
  }

  async function place() {
    if (!priced) return;
    heavyHaptic();
    const { side, legs, orders, cost } = priced;
    setRunningSide(side);
    setOutcomes(legs.map((leg) => ({ symbol: leg.symbol, status: "waiting" })));
    setStep("progress");
    const opening = cost.kind === "relayer" && cost.opens === "holding";
    if (opening) {
      setCovering(true);
      const symbols = legs.filter((leg) => leg.side === "buy").map((leg) => leg.symbol);
      const result = await service
        .openHoldings(portfolioId, symbols, cost.feeRaw)
        .catch((): Awaited<ReturnType<typeof service.openHoldings>> => ({
          kind: "unknown",
          completed: [],
        }));
      setCovering(false);
      if (result.kind !== "confirmed") {
        errorHaptic();
        const paid = "completed" in result && result.completed.length > 0;
        const notPlaced = legs.map((leg) => ({
          symbol: leg.symbol,
          status: "not placed" as const,
        }));
        setOutcomes(notPlaced);
        setClosing(
          paid
            ? copy.holdingsOpenFailed
            : copy.noOrderPlaced(describeFailure(result, "mobile").error),
        );
        return setStep("result");
      }
      setOpened(true);
    }
    const amountOf = new Map(legs.map((leg) => [leg.symbol, leg.amount]));
    const final = await runLegs(
      orders.map((order) => ({ symbol: order.stock.symbol, plan: order })),
      {
        now: Date.now,
        requote: (symbol) => service.quote(portfolioId, side, symbol, amountOf.get(symbol) ?? 0),
        approve: (symbol, reviewed, replacement) =>
          new Promise<boolean>((answer) => {
            warningHaptic();
            setApproval({
              view: pieApprovalView({
                symbol,
                reviewed: symbolOf(reviewed),
                replacement: symbolOf(replacement),
                shownUnits,
                nameOf,
              }),
              answer: (accepted) => {
                setApproval(null);
                answer(accepted);
              },
            });
          }),
        submit,
        onChange: setOutcomes,
      },
    );
    const stopped = pieRunStopped(final);
    if (stopped || mode === "invest" || side === "buy") {
      return finish(final, stopped ? copy.stopped : opening ? copy.holdingsOpen : null);
    }
    // The sells landed: the buys are planned from the cash they really returned, read from the chain.
    const cashBefore = cash;
    const reread = await withinLimit(service.refresh(portfolioId), WAITING_LIMIT_MS.content).catch(
      () => false,
    );
    if (!reread) return finish(final, copy.proceedsUnread);
    const after = currentPortfolio(portfolioId);
    if (!after) return finish(final, copy.proceedsUnread);
    const proceeds = Math.max(cashOf(after) - cashBefore, 0);
    const buys = planInvest(proceeds, pieSlices(after));
    if (buys.length === 0) return finish(final, null);
    setOutcomes([]);
    await price("buy", buys, proceeds);
  }

  const busy = pricingNow || (step === "progress" && !working.overdue);
  const dirty = amountText !== "" && step !== "result";
  const back =
    step === "review"
      ? () => setStep("input")
      : step === "risks"
        ? () => setStep("review")
        : undefined;

  let body: React.ReactNode = null;
  let footer: React.ReactNode = undefined;

  if (step === "input" && mode === "invest") {
    if (cash <= 0) {
      body = <EmptyState title={copy.noCash} detail={copy.noCashDetail} />;
      footer = <Button label={copy.addMoney} onPress={() => onAddMoney(portfolioId)} />;
    } else {
      body = (
        <>
          <View style={styles.amountRow}>
            <View style={styles.grow}>
              <AmountField
                label={invest.label}
                value={amountText}
                onChange={setAmountText}
                placeholder={commonCopy.amountPlaceholder}
              />
            </View>
            <Button
              variant="quiet"
              label={commonCopy.max}
              onPress={() => setAmountText(String(cash))}
            />
          </View>
          <Row label={commonCopy.cash} value={invest.available} last />
          {invest.overCash && (
            <Text variant="note" tone="danger" accessibilityRole="alert">
              {invest.overCash}
            </Text>
          )}
          {invest.split && (
            <View style={styles.group}>
              <Text accessibilityRole="header" style={styles.medium}>
                {invest.split.title}
              </Text>
              {invest.split.legs.map((leg) => (
                <Row key={leg.symbol} label={leg.name} value={leg.amount} />
              ))}
            </View>
          )}
          {floor && (
            <View>
              <Text variant="note" tone="warning">
                {floor.text}
              </Text>
              <Button
                variant="quiet"
                label={floor.use}
                onPress={() => setAmountText(String(floor.amount))}
                style={styles.link}
              />
            </View>
          )}
          {invest.waiting && <Text variant="faint">{invest.waiting}</Text>}
          {notice && <Notice tone="danger">{notice}</Notice>}
          {!online && <Notice tone="warning">{mobilePieCopy.order.offline}</Notice>}
        </>
      );
      footer = (
        <Button
          label={invest.review.label}
          disabled={invest.review.disabled || floor !== null || !online || !tradable || pricingNow}
          onPress={() => void price("buy", preview, amount)}
        />
      );
    }
  } else if (step === "input") {
    body = (
      <>
        <Text tone="dim">{rebalance.lead}</Text>
        {rebalance.sells.map((sell) => (
          <Row key={sell.symbol} label={sell.label} value={sell.amount} />
        ))}
        {rebalance.nothingToSell && <Text tone="dim">{rebalance.nothingToSell}</Text>}
        {leftAlone && <Text variant="faint">{leftAlone}</Text>}
        {notice && <Notice tone="danger">{notice}</Notice>}
        {!online && <Notice tone="warning">{mobilePieCopy.order.offline}</Notice>}
      </>
    );
    footer = (
      <Button
        label={rebalance.price.label}
        disabled={rebalance.price.disabled || !online || !tradable || pricingNow}
        onPress={() => void price("sell", rebalancing.sells, 0)}
      />
    );
  } else if (step === "risks") {
    body = <RiskSections />;
  } else if (step === "review" && priced) {
    const review = pieReviewView({
      mode,
      side: priced.side,
      orders: priced.orders.map(symbolOf),
      cost: priced.cost,
      leftover: priced.leftover,
      noirwireFeeBps: service.noirwireFeeBps(),
      shownUnits,
      nameOf,
      pending,
    });
    body = (
      <>
        {review.step && <Text variant="note">{review.step}</Text>}
        <Panel>
          {review.orders.map((order, index) => (
            <View key={order.symbol} style={[styles.order, index > 0 && styles.ruled]}>
              <View style={styles.orderHead}>
                <Text style={styles.grow}>{order.name}</Text>
                <Text style={styles.tabular}>{order.amount}</Text>
              </View>
              <Text variant="faint">{order.terms}</Text>
            </View>
          ))}
        </Panel>
        <Panel>
          {review.totals.map((total) => (
            <Row key={total.label} label={total.label} value={total.value} />
          ))}
          <Row label={review.networkCost.label} value={review.networkCost.value} last />
        </Panel>
        {review.networkCost.explanation.map((line) => (
          <Text key={line} variant="faint">
            {line}
          </Text>
        ))}
        <Text variant="faint">{review.sequence}</Text>
        {review.smallOrders && <Text variant="faint">{review.smallOrders}</Text>}
        {review.someUnchecked && <Notice tone="warning">{review.someUnchecked}</Notice>}
        {review.quantityUnknown && <Notice tone="warning">{review.quantityUnknown}</Notice>}
        {review.feeUnverified && <Notice tone="warning">{review.feeUnverified}</Notice>}
        {review.trackers && (
          <View>
            <Text variant="note">{copy.trackersLine}</Text>
            <Button
              variant="quiet"
              label={copy.readRisks}
              onPress={() => setStep("risks")}
              style={styles.link}
            />
          </View>
        )}
        <Text variant="note" tone="warning">
          {copy.publicLine}
        </Text>
        <PendingNote pending={pending} />
        {!online && <Notice tone="warning">{mobilePieCopy.order.offline}</Notice>}
      </>
    );
    footer = (
      <>
        <Button
          label={review.confirm.label}
          disabled={review.confirm.disabled || !online}
          onPress={() => void place()}
        />
        {review.back.ends && (
          <Button
            variant="quiet"
            label={review.back.label}
            onPress={() => finish(outcomes, null)}
          />
        )}
      </>
    );
  } else if (step === "progress" || step === "result") {
    const headline =
      step === "result"
        ? pieResultHeadline(outcomes)
        : covering
          ? copy.openingHoldings
          : pieProgressHeadline({ kind: "running", side: runningSide }, outcomes);
    body = (
      <>
        {opened && <Text variant="note">{copy.holdingsOpen}</Text>}
        <Text variant={step === "result" ? "display" : "h2"} accessibilityRole="header">
          {headline}
        </Text>
        {approval && (
          <Panel raised accessibilityRole="alert">
            <Text style={styles.medium}>{approval.view.title}</Text>
            <Text variant="faint">{approval.view.reviewed}</Text>
            <Text variant="faint">{approval.view.now}</Text>
            {approval.view.paysOwnCost && <Text variant="note">{approval.view.paysOwnCost}</Text>}
            <Button label={approval.view.accept} onPress={() => approval.answer(true)} />
            <Button
              variant="quiet"
              label={approval.view.stop}
              onPress={() => approval.answer(false)}
            />
          </Panel>
        )}
        <StepList steps={pieLegSteps(outcomes, nameOf)} />
        {step === "result" && closing && <Text variant="faint">{closing}</Text>}
        {step === "progress" && !working.overdue && <StillWorking waiting={working} />}
        {step === "progress" && <ActionOverdue waiting={working} />}
      </>
    );
    footer =
      step === "result" ? (
        <Button label={commonCopy.done} onPress={onClose} />
      ) : working.overdue ? (
        <Button variant="quiet" label={commonCopy.close} onPress={onClose} />
      ) : undefined;
  }

  return (
    <Sheet
      open
      title={step === "risks" ? copy.risksTitle : title}
      onClose={onClose}
      onBack={back}
      dirty={dirty}
      busy={busy}
      footer={footer}
    >
      <IdentityLine tint={tint} />
      {body}
      {step === "input" && pricingNow && <StillWorking waiting={pricingWait} />}
    </Sheet>
  );
}

function currentPortfolio(id: string) {
  return getSnapshot()?.portfolios.find((entry) => entry.id === id) ?? null;
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: "row", alignItems: "flex-end", gap: layout.tight },
  grow: { flex: 1, minWidth: 0 },
  group: { gap: layout.tight },
  medium: { fontFamily: fonts.medium },
  tabular: { fontVariant: ["tabular-nums"] },
  link: { alignSelf: "flex-start", paddingHorizontal: 0 },
  order: { gap: layout.hairline, paddingVertical: layout.tight },
  ruled: { borderTopWidth: 1, borderTopColor: colors["line-subtle"] },
  orderHead: { flexDirection: "row", gap: layout.tight },
});
