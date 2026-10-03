import type { Attempt } from "@noirwire/shared/application";
import { networkCostCopy, tradeCopy } from "@noirwire/shared/copy";
import {
  resolvePortfolioIcon,
  shares,
  symbolAmount,
  usd,
  type NetworkCost,
  type Portfolio,
  type PortfolioIcon,
  type Side,
  type Wallet,
} from "@noirwire/shared/domain";
import { describeFailure, tradeReviewView } from "@noirwire/shared/presentation";
import { activePortfolios, cashOf, shownUnits } from "@noirwire/shared/wallet";
import type { Step } from "@/ui";
import { mobileTradeCopy as copy } from "./copy";
import type { Order } from "./tradeService";

/**
 * The trade sheet's mobile view model: what the shared trade view models do
 * not say yet, in the words the phone's spec uses. A candidate to move into
 * @noirwire/shared/presentation.
 */

export type PortfolioChoice = {
  id: string;
  label: string;
  icon: PortfolioIcon;
  caption: string;
};

/** The portfolios that can take part: any active one to buy, only those holding the tracker to sell. */
export function portfolioChoices(
  wallet: Wallet,
  side: Side,
  symbol: string | null,
): PortfolioChoice[] {
  return activePortfolios(wallet)
    .filter(
      (portfolio) =>
        side === "buy" ||
        portfolio.holdings.some((holding) => holding.symbol === symbol && holding.amount > 0),
    )
    .map((portfolio) => ({
      id: portfolio.id,
      label: portfolio.label,
      icon: resolvePortfolioIcon(portfolio.icon),
      caption:
        side === "buy" || symbol === null
          ? copy.cashAvailable(symbolAmount("USDC", cashOf(portfolio)))
          : copy.held(shownHeld(portfolio, symbol)),
    }));
}

function shownHeld(portfolio: Portfolio, symbol: string) {
  const raw = portfolio.holdings.find((holding) => holding.symbol === symbol)?.amount ?? 0;
  const shown = shownUnits(symbol, raw);
  return shown === undefined ? tradeCopy.feeUnknown : `${shares(shown)} ${symbol}`;
}

/** The order's floor on the amount step: whether Review is held back for being under the smallest order. */
export function amountFloor(state: {
  side: Side;
  /** The typed amount in dollars, or 0 when it cannot be worked out. */
  dollars: number;
  valid: boolean;
  smallest: number;
}) {
  const smallest = state.smallest.toFixed(0);
  const below = state.valid && state.dollars > 0 && state.dollars < state.smallest;
  return {
    caption: copy.smallestOrder(smallest),
    below: below ? copy.belowSmallest(smallest) : null,
  };
}

export type ReviewState = Parameters<typeof tradeReviewView>[0] & {
  side: Side;
  /** The order's network cost was already paid on an earlier attempt. */
  costPaid: boolean;
  online: boolean;
  /** A replaced review holds Confirm back for a moment, so it is never pressed under a changed price. */
  settling: boolean;
  /** The relayer could not be used for this order, so it cannot go ahead now. */
  relayerDown: boolean;
};

function networkFigure(cost: NetworkCost, costPaid: boolean, shared: string) {
  if (costPaid) return copy.alreadyPaid;
  if (cost.kind === "covered") return copy.includedInFee;
  return shared;
}

export function reviewModel(state: ReviewState) {
  const shared = tradeReviewView(state);
  const { order, symbol, unitsPerHeld, portfolioLabel } = state;
  const buying = state.side === "buy";
  const tracker = (raw: number) =>
    unitsPerHeld === undefined ? tradeCopy.feeUnknown : `${shares(raw * unitsPerHeld)} ${symbol}`;
  const network = networkFigure(state.cost, state.costPaid, shared.networkCost.value);
  const relayerFee = state.cost.kind === "relayer" && !state.costPaid ? state.cost.fee : 0;
  const expiresAt = order.quote.expiresAt;
  const seconds = expiresAt ? Math.ceil((expiresAt - state.now) / 1000) : null;
  const expired = seconds !== null && seconds <= 0;
  const reasons = state.costPaid ? [copy.alreadyPaidReason] : [...shared.networkCost.explanation];
  const confirmDisabled =
    shared.action.kind !== "confirm" ||
    shared.action.disabled ||
    !state.online ||
    state.settling ||
    state.relayerDown;
  return {
    headline: buying
      ? [
          copy.headline.spend(usd(order.spend), portfolioLabel),
          copy.headline.receiveAtLeast(tracker(order.receiveAtLeast)),
        ]
      : [
          copy.headline.sell(tracker(order.spend), portfolioLabel),
          copy.headline.receiveAtLeast(usd(order.receiveAtLeast)),
        ],
    countdown: seconds === null ? null : expired ? tradeCopy.expired : copy.heldFor(seconds),
    terms: shared.terms.map((term) =>
      term.label === networkCostCopy.label ? { ...term, value: network } : term,
    ),
    total: buying
      ? { label: copy.totalCost, value: symbolAmount("USDC", order.spend + relayerFee) }
      : {
          label: copy.totalReceive,
          value: symbolAmount("USDC", Math.max(order.receiveAtLeast - relayerFee, 0)),
        },
    reasons,
    costDetails: shared.networkCost.details
      ? { summary: copy.whatIsCost, body: shared.networkCost.details.body }
      : null,
    minimum: shared.stopsBelowMinimum,
    notFirm: shared.notFirm,
    priceUnchecked: shared.priceUnchecked,
    feeUnverified: order.quote.feeBps === undefined ? tradeCopy.feeUnverified : null,
    trackerLine: buying ? copy.trackerLine(symbol) : null,
    readRisks: copy.readRisks,
    publicLine: copy.publicLine,
    offline: state.online ? null : copy.offline,
    action:
      shared.action.kind === "newPrice"
        ? { kind: "newPrice" as const, label: shared.action.label }
        : { kind: "confirm" as const, label: shared.action.label, disabled: confirmDisabled },
  };
}

export type Phase = "starting" | "covering" | "acting";

/** The progress list in plain words: a first buy opens the holding, then prices and places the order. */
export function progressSteps(state: { firstBuy: boolean; symbol: string; phase: Phase }): Step[] {
  const { phase } = state;
  const p = copy.progress;
  if (!state.firstBuy) {
    return [
      { key: "placing", title: p.placing, status: "current" },
      { key: "reading", title: p.reading, status: "waiting" },
    ];
  }
  const opened = phase === "acting";
  return [
    {
      key: "opening",
      title: p.opening(state.symbol),
      status: opened ? "done" : "current",
      ...(opened ? { caption: p.opened } : {}),
    },
    { key: "pricing", title: p.pricing, status: opened ? "current" : "waiting" },
    { key: "placing", title: p.placing, status: "waiting" },
    { key: "reading", title: p.reading, status: "waiting" },
  ];
}

export type ResultView = {
  tone: "success" | "warning" | "error";
  headline: string;
  body: string;
  primary: string;
  /** Offered only after an order failed with its holding already open. */
  newPrice: string | null;
};

export type Outcome =
  | { kind: "result"; view: ResultView }
  | {
      kind: "review";
      notice: { tone: "danger" | "warning"; text: string };
      replacement?: Order;
      reviewAgain?: "relayer" | "other";
      costPaid?: boolean;
      relayerDown?: boolean;
    };

const endsWithState = (text: string) =>
  /Nothing (was|is) (traded|sent|charged)|Not signed/.test(text);

/** What the sheet does with an attempt's answer: a result step, or back to the review with a reason. */
export function outcomeOf(
  result: Attempt<Order>,
  context: {
    side: Side;
    symbol: string;
    portfolioLabel: string;
    reviewed: Order;
    unitsPerHeld: number | undefined;
  },
): Outcome {
  const r = copy.result;
  const { side, symbol, portfolioLabel, reviewed } = context;
  const completed = "completed" in result && result.completed.length > 0;
  if (result.kind === "confirmed") {
    if (result.settlement === "balancesEstimated") {
      return {
        kind: "result",
        view: {
          tone: "success",
          headline: r.placed,
          body: r.placedUnread,
          primary: r.done,
          newPrice: null,
        },
      };
    }
    const tokens = side === "buy" ? reviewed.receive : reviewed.spend;
    const amount =
      context.unitsPerHeld === undefined
        ? symbol
        : `${shares(tokens * context.unitsPerHeld)} ${symbol}`;
    return {
      kind: "result",
      view: {
        tone: "success",
        headline: side === "buy" ? r.bought(amount) : r.sold(amount),
        body:
          side === "buy"
            ? r.boughtFor(usd(reviewed.spend), portfolioLabel)
            : r.soldFor(usd(reviewed.receive), portfolioLabel),
        primary: r.done,
        newPrice: null,
      },
    };
  }
  if (result.kind === "unknown") {
    return {
      kind: "result",
      view: {
        tone: "warning",
        headline: r.unknown,
        body: r.unknownBody(portfolioLabel),
        primary: r.close,
        newPrice: null,
      },
    };
  }
  const orderNotPlaced =
    completed &&
    (result.kind === "failed" ||
      (result.kind === "needsReview" && result.change.because === "priceMoved"));
  if (orderNotPlaced) {
    return {
      kind: "result",
      view: {
        tone: "error",
        headline: r.notPlaced,
        body: r.notPlacedBody,
        primary: r.close,
        newPrice: r.reviewNewPrice,
      },
    };
  }
  if (result.kind === "needsReview") {
    const { change } = result;
    if (change.because === "priceMoved") {
      return {
        kind: "review",
        notice: { tone: "warning", text: copy.priceMoved },
        replacement: change.replacement,
      };
    }
    if (change.because === "networkCostRose") {
      return {
        kind: "review",
        notice: { tone: "warning", text: copy.costRose },
        reviewAgain: "relayer",
        costPaid: completed,
      };
    }
    return {
      kind: "review",
      notice: { tone: "warning", text: copy.notNow },
      reviewAgain: "other",
      relayerDown: true,
      costPaid: completed,
    };
  }
  const failure = describeFailure(result);
  const text =
    endsWithState(failure.error) || completed
      ? failure.error
      : `${failure.error} ${copy.nothingTraded}`;
  return {
    kind: "review",
    notice: { tone: "danger", text },
    ...(failure.reviewAgain ? { reviewAgain: failure.reviewAgain } : {}),
    ...(failure.costCovered ? { costPaid: true } : {}),
  };
}
