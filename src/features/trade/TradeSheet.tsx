import { costAgreed, tradeDraft, type Denomination } from "@noirwire/shared/application";
import { commonCopy, marketsCopy, mobileTradeCopy, tradeCopy as copy } from "@noirwire/shared/copy";
import { resolvePortfolioIcon, type NetworkCost, type Side } from "@noirwire/shared/domain";
import { networkLabel, type TradePlan } from "@noirwire/shared/infrastructure";
import { getPlatform } from "@noirwire/shared/platform";
import {
  amountFloor,
  portfolioChoices,
  tradeFormView,
  tradeOutcome,
  tradeProgressSteps,
  tradeReviewView,
  type TradePhase,
  type TradeResultView,
} from "@noirwire/shared/presentation";
import { asset, cashOf, isLivePrice, screenReads, unitsPerHeld } from "@noirwire/shared/wallet";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  ChoicePanel,
  Divider,
  EmptyState,
  Notice,
  Panel,
  Row,
  Segmented,
  Sheet,
  StepList,
  Text,
} from "@/ui";
import { errorHaptic, heavyHaptic, successHaptic, warningHaptic } from "@/ui/haptics";
import { fonts, layout } from "@/ui/theme";
import { useLivePrices, useWalletSnapshot } from "../markets/useMarketData";
import { PendingNote } from "../network/PendingNote";
import { usePendingBlock } from "../network/usePendingBlock";
import { useServices } from "../services";
import { ActingHeader, AmountField, IdentityLine, RiskSections, TrackerChooser } from "./parts";
import { useTrading } from "./useTrading";

type Step = "portfolio" | "tracker" | "amount" | "review" | "risks" | "progress" | "result";

type TradeSheetProps = {
  side: Side;
  symbol: string | null;
  portfolioId: string | null;
  onClose: () => void;
  /** No cash to invest: this sheet closes and money is moved in instead. */
  onAddMoney: (portfolioId: string) => void;
};

/** Read when a review is shown and once a second after, for the price countdown. */
const clock = () => Date.now();

/** A review replaced under the user's finger holds Confirm back this long. */
export const REPLACED_HOLD_MS = 600;
/** After this long in progress, the sheet says it is still working. */
export const STILL_WORKING_MS = 20_000;

/** Spec 2.20: buy or sell one tracker in one portfolio, at a price the user has seen. */
export function TradeSheet({
  side,
  symbol: initialSymbol,
  portfolioId: initialPortfolio,
  onClose,
  onAddMoney,
}: TradeSheetProps) {
  const service = useTrading();
  const online = useServices().useOnline();
  const wallet = useWalletSnapshot();
  const updatedAt = useLivePrices();
  const choices = wallet ? portfolioChoices(screenReads, wallet, side, initialSymbol) : [];
  const preselected = initialPortfolio ?? (choices.length === 1 ? choices[0].id : null);
  const askPortfolio = preselected === null;
  const askTracker = initialSymbol === null;

  const [step, setStep] = useState<Step>(
    askPortfolio ? "portfolio" : askTracker ? "tracker" : "amount",
  );
  const [portfolioId, setPortfolioId] = useState<string | null>(
    preselected ?? choices[0]?.id ?? null,
  );
  const [symbol, setSymbol] = useState<string | null>(initialSymbol);
  const [denom, setDenom] = useState<Denomination>(side === "buy" ? "cash" : "units");
  const [amountText, setAmountText] = useState("");
  const [plan, setPlan] = useState<TradePlan | null>(null);
  const [network, setNetwork] = useState<{ lamports: number; cost: NetworkCost } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "danger" | "warning"; text: string } | null>(null);
  const [now, setNow] = useState(clock);
  const [phase, setPhase] = useState<TradePhase>("starting");
  const [stillWorking, setStillWorking] = useState(false);
  const [result, setResult] = useState<TradeResultView | null>(null);
  const [costPaid, setCostPaid] = useState(false);
  const [relayerDown, setRelayerDown] = useState(false);
  const [withoutRelayer, setWithoutRelayer] = useState(false);
  const [settling, setSettling] = useState(false);
  const [showCost, setShowCost] = useState(false);

  const pending = usePendingBlock(portfolioId);
  const reviewing = step === "review" || step === "risks";
  useEffect(() => {
    if (!reviewing) return;
    const timer = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(timer);
  }, [reviewing]);
  useEffect(() => {
    if (step !== "progress") return;
    const timer = setTimeout(() => setStillWorking(true), STILL_WORKING_MS);
    return () => clearTimeout(timer);
  }, [step]);
  useEffect(() => {
    if (!settling) return;
    const timer = setTimeout(() => setSettling(false), REPLACED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [settling]);

  const portfolio = wallet?.portfolios.find((entry) => entry.id === portfolioId) ?? null;
  const entry = symbol ? asset(symbol) : undefined;
  const name = entry?.name ?? null;
  const title = step === "tracker" ? copy.chooseTracker(side) : copy.title(side, name);
  const icon = portfolio ? resolvePortfolioIcon(portfolio.icon) : null;

  if (!wallet || (!portfolio && step !== "portfolio")) {
    return (
      <Sheet open title={title} onClose={onClose}>
        <EmptyState
          title={marketsCopy.detail.notFound}
          detail={marketsCopy.detail.createPortfolioFirst}
        />
      </Sheet>
    );
  }

  const cash = portfolio ? cashOf(portfolio) : 0;
  const heldRaw = portfolio?.holdings.find((holding) => holding.symbol === symbol)?.amount ?? 0;
  const units = symbol ? unitsPerHeld(symbol) : undefined;
  const displayLive = !!symbol && updatedAt !== null && isLivePrice(symbol);
  const draft = tradeDraft({
    side,
    denom,
    amountText,
    cash,
    heldRaw,
    unitsPerHeld: units,
    displayPrice: displayLive ? (entry?.price ?? 0) : 0,
  });
  const form = tradeFormView({
    draft,
    side,
    denom,
    symbol: symbol ?? "",
    cash,
    displayLive,
    quoting,
  });
  const floor = amountFloor({
    dollars: draft.value,
    valid: draft.valid,
    smallest: service.smallestOrderUsd(),
  });
  const tradable = service.available();

  async function review(paid = costPaid) {
    if (!portfolio || !symbol) return;
    setFormError(null);
    setNotice(null);
    setQuoting(true);
    const quoted = await service.quote(portfolio.id, side, symbol, draft.amountToQuote);
    if ("error" in quoted) {
      setQuoting(false);
      setFormError(quoted.error);
      return setStep("amount");
    }
    if (side === "buy" && quoted.plan.spend > cash) {
      setQuoting(false);
      setFormError(copy.priceAboveCash);
      return setStep("amount");
    }
    try {
      setNetwork(
        paid
          ? { lamports: 0, cost: { kind: "covered" } }
          : await service.reviewCost(portfolio.id, [quoted.plan], withoutRelayer),
      );
    } catch {
      setQuoting(false);
      setFormError(copy.costCheckFailed);
      return setStep("amount");
    }
    setQuoting(false);
    setPlan(quoted.plan);
    setNow(clock());
    getPlatform().track("trade_reviewed", { side });
    setStep("review");
  }

  async function confirm() {
    if (!portfolio || !symbol || !plan || !network) return;
    heavyHaptic();
    setPhase("starting");
    setStillWorking(false);
    setStep("progress");
    const reviewed = plan;
    const attempt = await service.place(portfolio.id, reviewed, {
      ...costAgreed(costPaid ? null : network.cost),
      onStep: (next) => setPhase(next === "covering" ? "covering" : "acting"),
    });
    const outcome = tradeOutcome(attempt, {
      side,
      symbol,
      portfolioLabel: portfolio.label,
      reviewed,
      unitsPerHeld: units,
      platform: "mobile",
    });
    if (outcome.kind === "result") {
      if (outcome.view.tone === "success") successHaptic();
      else if (outcome.view.tone === "warning") warningHaptic();
      else errorHaptic();
      setResult(outcome.view);
      if (outcome.view.newPrice) setCostPaid(true);
      return setStep("result");
    }
    if (outcome.notice.tone === "danger") errorHaptic();
    else warningHaptic();
    setNotice(outcome.notice);
    const paid = costPaid || !!outcome.costPaid;
    setCostPaid(paid);
    if (outcome.relayerDown) setRelayerDown(true);
    if (outcome.replacement) {
      setPlan(outcome.replacement);
      setSettling(true);
    }
    if (outcome.reviewAgain && !paid) {
      const off = withoutRelayer || outcome.reviewAgain === "other";
      setWithoutRelayer(off);
      const next = await service
        .reviewCost(portfolio.id, [outcome.replacement ?? reviewed], off)
        .catch(() => ({
          lamports: network.lamports,
          cost: { kind: "unavailable" } as NetworkCost,
        }));
      setNetwork(next);
      setSettling(true);
    }
    if (paid) setNetwork({ lamports: 0, cost: { kind: "covered" } });
    setStep("review");
  }

  const back =
    step === "amount"
      ? askTracker
        ? () => setStep("tracker")
        : askPortfolio
          ? () => setStep("portfolio")
          : undefined
      : step === "tracker" && askPortfolio
        ? () => setStep("portfolio")
        : step === "review"
          ? () => {
              setPlan(null);
              setNotice(null);
              setStep("amount");
            }
          : step === "risks"
            ? () => setStep("review")
            : undefined;

  const busy = step === "progress" || quoting;
  const dirty = amountText !== "" && step !== "result";
  const header = step !== "portfolio" && step !== "tracker" && (
    <>
      {icon && <IdentityLine tint={icon.tint} />}
      <ActingHeader
        portfolio={portfolio && icon ? { label: portfolio.label, icon } : null}
        tracker={
          symbol && entry
            ? {
                symbol,
                name: commonCopy.tracker(entry.name),
                caption: copy.issuerLine(symbol, entry.issuer),
              }
            : null
        }
      />
    </>
  );

  let body: React.ReactNode = null;
  let footer: React.ReactNode = undefined;

  if (step === "portfolio") {
    const chosen = choices.find((choice) => choice.id === portfolioId) ?? choices[0];
    body = (
      <>
        <Text tone="dim">{copy.whichPortfolio(side)}</Text>
        {choices.map((choice) => (
          <ChoicePanel
            key={choice.id}
            title={choice.label}
            captions={[{ text: choice.caption, tone: "dim" }]}
            selected={choice.id === chosen?.id}
            onSelect={() => setPortfolioId(choice.id)}
          />
        ))}
      </>
    );
    footer = chosen && (
      <Button
        label={copy.continueWith(chosen.label)}
        onPress={() => {
          setPortfolioId(chosen.id);
          setAmountText("");
          setStep(askTracker ? "tracker" : "amount");
        }}
      />
    );
  } else if (step === "tracker") {
    body = (
      <TrackerChooser
        label={copy.trackerLabel}
        onChoose={(next) => {
          setSymbol(next);
          setAmountText("");
          setStep("amount");
        }}
      />
    );
  } else if (step === "amount") {
    const disabledDenom = form.denominations.find((option) => option.disabled);
    const reviewDisabled =
      form.action.kind === "review" &&
      (form.action.disabled || floor.below !== null || !online || !tradable);
    body = (
      <>
        {header}
        {!tradable && (
          <Notice tone="warning">{commonCopy.tradingUnavailableOn(networkLabel())}</Notice>
        )}
        {form.action.kind === "addMoney" ? (
          <EmptyState title={copy.noCash} detail={copy.noCashDetail} />
        ) : (
          <>
            <Segmented
              label={copy.amountIn}
              options={form.denominations.map((option) => option.label)}
              value={form.denominations.find((option) => option.denom === denom)?.label ?? ""}
              onChange={(label) => {
                const option = form.denominations.find((candidate) => candidate.label === label);
                if (!option || option.disabled) return;
                setDenom(option.denom);
                setAmountText("");
              }}
            />
            {disabledDenom && <Text variant="faint">{copy.noLiveToConvert}</Text>}
            {form.balanceUnavailable ? (
              <Text tone="dim">{form.balanceUnavailable}</Text>
            ) : (
              <View style={styles.amountRow}>
                <View style={styles.grow}>
                  <AmountField
                    label={form.amountLabel}
                    value={amountText}
                    onChange={setAmountText}
                    placeholder={commonCopy.amountPlaceholder}
                  />
                </View>
                <Button
                  variant="quiet"
                  label={form.maxLabel}
                  onPress={() => setAmountText(String(draft.cap))}
                />
              </View>
            )}
            <Text tone="dim">{form.available}</Text>
            <Text tone="dim">{form.estimate}</Text>
            {form.overCap && (
              <Text variant="note" tone="danger" accessibilityRole="alert">
                {form.overCap}
              </Text>
            )}
            <Text variant="faint">{floor.below ?? floor.caption}</Text>
            {formError && <Notice tone="danger">{formError}</Notice>}
            {!online && <Notice tone="warning">{mobileTradeCopy.offline}</Notice>}
          </>
        )}
      </>
    );
    footer =
      form.action.kind === "addMoney" ? (
        <Button label={form.action.label} onPress={() => portfolio && onAddMoney(portfolio.id)} />
      ) : (
        <Button
          label={form.action.label}
          disabled={reviewDisabled}
          loading={quoting}
          loadingLabel={copy.gettingPrice}
          onPress={() => void review()}
        />
      );
  } else if ((step === "review" || step === "risks") && plan && network && portfolio && symbol) {
    const model = tradeReviewView({
      platform: "mobile",
      order: plan,
      symbol,
      unitsPerHeld: units,
      portfolioLabel: portfolio.label,
      cost: network.cost,
      lamports: network.lamports,
      built: service.isBuilt(plan),
      noirwireFeeBps: service.noirwireFeeBps(),
      now,
      pending,
      submitting: false,
      covering: false,
      costPaid,
      online,
      settling,
      relayerDown,
    });
    if (step === "risks") {
      body = <RiskSections />;
    } else {
      body = (
        <>
          {header}
          <View accessibilityRole="header" accessibilityLabel={model.headline.join(", ")}>
            <Text style={styles.medium}>{model.headline[0]}</Text>
            <Text>{model.headline[1]}</Text>
          </View>
          {model.countdown && <Text variant="faint">{model.countdown}</Text>}
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          <Panel>
            {model.terms.map((term) => (
              <Row key={term.label} label={term.label} value={term.value} />
            ))}
            <Divider />
            <Row label={model.total.label} value={model.total.value} last />
          </Panel>
          {model.reasons.map((reason) => (
            <Text key={reason} variant="faint">
              {reason}
            </Text>
          ))}
          {model.costDetails && (
            <>
              <Button
                variant="quiet"
                label={model.costDetails.summary}
                onPress={() => setShowCost(!showCost)}
                style={styles.link}
              />
              {showCost && <Text variant="note">{model.costDetails.body}</Text>}
            </>
          )}
          <Text variant="faint">{model.stopsBelowMinimum}</Text>
          {model.notFirm && <Text variant="faint">{model.notFirm}</Text>}
          {model.priceUnchecked && <Notice tone="warning">{model.priceUnchecked}</Notice>}
          {model.feeUnverified && <Notice tone="warning">{model.feeUnverified}</Notice>}
          {model.offline && <Notice tone="warning">{model.offline}</Notice>}
          {model.trackerLine && (
            <View>
              <Text variant="note">{model.trackerLine}</Text>
              <Button
                variant="quiet"
                label={model.readRisks}
                onPress={() => setStep("risks")}
                style={styles.link}
              />
            </View>
          )}
          <Text variant="note" tone="warning">
            {model.publicLine}
          </Text>
          <PendingNote pending={pending} />
        </>
      );
      footer =
        model.action.kind === "newPrice" ? (
          <Button
            label={model.action.label}
            loading={quoting}
            loadingLabel={copy.gettingPrice}
            onPress={() => void review()}
          />
        ) : (
          <Button
            label={model.action.label}
            disabled={model.action.disabled}
            onPress={() => void confirm()}
          />
        );
    }
  } else if (step === "progress" && symbol) {
    const firstBuy =
      !costPaid && network?.cost.kind === "relayer" && network.cost.opens === "holding";
    body = (
      <>
        {header}
        <StepList steps={tradeProgressSteps({ firstBuy, symbol, phase })} />
        {stillWorking && <Text variant="faint">{copy.progress.stillWorking}</Text>}
      </>
    );
  } else if (step === "result" && result) {
    body = (
      <>
        {header}
        <Text variant="display" accessibilityRole="header">
          {result.headline}
        </Text>
        <Text tone="dim">{result.body}</Text>
      </>
    );
    footer = (
      <>
        {result.newPrice && (
          <Button
            label={result.newPrice}
            onPress={() => {
              setNotice(null);
              void review(true);
            }}
          />
        )}
        <Button
          variant={result.newPrice ? "quiet" : "primary"}
          label={result.primary}
          onPress={onClose}
        />
      </>
    );
  }

  return (
    <Sheet
      open
      title={
        step === "risks"
          ? copy.risksTitle
          : step === "progress" || step === "result"
            ? copy.progress.title(side)
            : title
      }
      onClose={onClose}
      onBack={back}
      dirty={dirty}
      busy={busy}
      footer={footer}
    >
      {body}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  amountRow: { flexDirection: "row", alignItems: "flex-end", gap: layout.tight },
  grow: { flex: 1 },
  medium: { fontFamily: fonts.medium },
  link: { alignSelf: "flex-start", paddingHorizontal: 0, minHeight: 44 },
});
