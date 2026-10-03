import type { EarnAction, earnDraft } from "@noirwire/shared/application";
import { commonCopy, earnCopy } from "@noirwire/shared/copy";
import { symbolAmount, usd, type NetworkCost } from "@noirwire/shared/domain";
import { earnPortfolioView, earnSummaryView, networkCostView } from "@noirwire/shared/presentation";
import { mobileEarnCopy as copy } from "./copy";

/**
 * The Earn screen's and sheet's view models (spec 2.26, 2.27): the shared
 * ones for the rate, each portfolio's row and the network cost, worded as
 * the phone words them. Candidates to move into
 * @noirwire/shared/presentation as a mobile variant.
 */

type EarnDraft = ReturnType<typeof earnDraft>;

const CASH = "USDC";

export type EarnRate = { apy: number; supplyApy: number; rewardsApy: number };
export type EarnPositionRead = { deposited: number; earnedSinceDeposit: number | null };

export type EarnPortfolio = {
  id: string;
  label: string;
  archived: boolean;
  cash: number;
  /** Undefined while it is read, null when it could not be. */
  position: EarnPositionRead | null | undefined;
};

export type EarnRowView = {
  id: string;
  label: string;
  cash: string;
  inEarn: string | null;
  earned: string | null;
  archived: string | null;
  restore: string | null;
  announcement: string;
  /** What tapping the row opens, or null when it cannot be chosen. */
  opens: EarnAction | null;
};

export type EarnScreenView = {
  title: string;
  venue: string;
  rateLabel: string;
  /** Null while the rate is read. */
  rate: { value: string; unavailable: boolean; announcement: string } | null;
  couldEarn: string | null;
  breakdown: string | null;
  mainnetOnly: string | null;
  deposit: { label: string; disabled: boolean; reason: string | null };
  withdraw: { label: string; disabled: boolean } | null;
  portfoliosTitle: string;
  inEarn: string;
  rows: readonly EarnRowView[];
  riskLine: string;
  readRisks: string;
  empty: { title: string; detail: string; action: string } | null;
};

const lent = (portfolio: EarnPortfolio) => portfolio.position?.deposited ?? 0;

/** Whether `portfolio` can be chosen for `action` (spec 2.27 step 1). */
export function qualifies(portfolio: EarnPortfolio, action: EarnAction): boolean {
  if (portfolio.archived || !portfolio.position) return false;
  return action === "deposit" ? portfolio.cash > 0 : portfolio.position.deposited > 0;
}

export function earnScreenView(state: {
  available: boolean;
  online: boolean;
  venue: string;
  /** Undefined while it is read, null when it could not be. */
  rate: EarnRate | null | undefined;
  portfolios: readonly EarnPortfolio[];
}): EarnScreenView {
  const { available, online, rate, portfolios } = state;
  const summary = earnSummaryView({
    available,
    rate: rate ?? null,
    deposits: portfolios.map((portfolio) => portfolio.position?.deposited ?? null),
  });
  const live = available && rate;
  const anyCash = portfolios.some((portfolio) => qualifies(portfolio, "deposit"));
  const anyLent = portfolios.some((portfolio) => lent(portfolio) > 0);
  const inert = !online || !available;
  return {
    title: copy.title,
    venue: state.venue,
    rateLabel: copy.rateLabel,
    rate:
      rate === undefined && available
        ? null
        : {
            value: summary.apy,
            unavailable: !live,
            announcement: live ? copy.rateAnnouncement(rate.apy.toFixed(2)) : summary.apy,
          },
    couldEarn: rate === undefined && available ? null : live ? summary.couldEarn : earnCopy.noRate,
    breakdown: live ? summary.breakdown : null,
    mainnetOnly: available ? null : earnCopy.mainnetOnly,
    deposit: {
      label: copy.deposit,
      disabled: inert || !anyCash,
      reason: anyCash || !available ? null : copy.noCash,
    },
    withdraw: anyLent ? { label: copy.withdraw, disabled: inert } : null,
    portfoliosTitle: copy.portfolios,
    inEarn: copy.inEarn,
    rows: portfolios.map((portfolio) => {
      const shared = earnPortfolioView({
        archived: portfolio.archived,
        available,
        cash: portfolio.cash,
        position: portfolio.position ?? null,
      });
      const inEarn = portfolio.position === undefined ? null : shared.inEarn;
      const opens = qualifies(portfolio, "deposit")
        ? "deposit"
        : qualifies(portfolio, "withdraw")
          ? "withdraw"
          : null;
      return {
        id: portfolio.id,
        label: portfolio.label,
        cash: shared.cashAvailable,
        inEarn,
        earned: shared.earnedLine,
        archived: portfolio.archived ? copy.archived : null,
        restore: portfolio.archived ? copy.restore : null,
        announcement: `${portfolio.label}, ${shared.cashAvailable}, ${inEarn ?? commonCopy.checking} ${copy.inEarn}`,
        opens: inert ? null : opens,
      };
    }),
    riskLine: copy.riskLine,
    readRisks: copy.readRisks,
    empty:
      portfolios.length === 0
        ? { title: copy.noPortfolio, detail: copy.noPortfolioDetail, action: copy.newPortfolio }
        : null,
  };
}

/** The sheet's first step: the portfolios that can take this action. */
export function earnChoiceView(
  action: EarnAction,
  portfolios: readonly EarnPortfolio[],
  chosen: string | null,
) {
  const choosable = portfolios.filter((portfolio) => qualifies(portfolio, action));
  const picked = choosable.find((portfolio) => portfolio.id === chosen);
  return {
    title: action === "deposit" ? copy.deposit : copy.withdraw,
    rows: choosable.map((portfolio) => ({
      id: portfolio.id,
      label: portfolio.label,
      detail:
        action === "deposit"
          ? copy.cash(usd(portfolio.cash))
          : copy.lent(usd(portfolio.position?.deposited ?? 0)),
    })),
    next: {
      label: picked ? copy.continueWith(picked.label) : commonCopy.continue,
      disabled: !picked,
    },
  };
}

type EarnAmountState = {
  action: EarnAction;
  draft: EarnDraft;
  portfolioLabel: string;
  amountText: string;
  /** Null while the network cost is worked out. */
  cost: NetworkCost | null;
  apy: number | undefined;
  online: boolean;
};

const feeOf = (cost: NetworkCost | null) => (cost?.kind === "relayer" ? cost.fee : 0);

/** The sheet's amount step: how much, with the maximum this portfolio can really move. */
export function earnAmountView(state: EarnAmountState) {
  const { action, draft, cost } = state;
  const typed = state.amountText.trim() !== "";
  const tooSmall =
    action === "withdraw" && draft.valid && cost !== null && draft.amount <= feeOf(cost);
  const validation = !typed
    ? null
    : !Number.isFinite(draft.amount) || draft.amount <= 0
      ? copy.invalidAmount
      : draft.amount > draft.max
        ? copy.moreThanAvailable
        : tooSmall
          ? copy.smallerThanCost
          : null;
  return {
    lead: copy.lead[action](state.portfolioLabel),
    amountLabel: earnCopy.amountLabel,
    placeholder: commonCopy.amountPlaceholder,
    max: commonCopy.max,
    available: { label: copy.available, value: symbolAmount(CASH, draft.max) },
    estimate:
      action === "deposit" && draft.valid && state.apy !== undefined
        ? earnCopy.yearEstimate(usd((draft.amount * state.apy) / 100), state.apy.toFixed(2))
        : null,
    validation,
    review: {
      label: cost === null ? commonCopy.checking : copy.review,
      disabled: cost === null || !draft.valid || tooSmall || !state.online,
    },
  };
}

/** The amount "Max" fills: exactly the maximum. */
export const earnMaxText = (draft: EarnDraft) => String(draft.max);

/** The sheet's review (spec 2.27 step 3), and whether it can be confirmed. */
export function earnReviewView(state: {
  action: EarnAction;
  amount: number;
  portfolioLabel: string;
  cost: NetworkCost;
  venue: string;
  pending: { blocked: boolean; note: string | null };
  online: boolean;
}) {
  const { action, amount, portfolioLabel, cost } = state;
  const depositing = action === "deposit";
  const network = networkCostView({
    cost,
    pending: { blocked: state.pending.blocked },
    submitting: false,
    withdrawing: !depositing,
  });
  const fee = feeOf(cost);
  const figure = (value: number) => symbolAmount(CASH, value);
  return {
    title: copy.reviewTitle,
    terms: depositing
      ? [
          { label: copy.terms.leavesCash(portfolioLabel), value: figure(amount) },
          { label: copy.terms.intoEarn, value: figure(amount) },
          { label: network.label, value: network.value },
        ]
      : [
          { label: copy.terms.leavesEarn, value: figure(amount) },
          { label: network.label, value: network.value },
        ],
    total: depositing
      ? { label: copy.terms.totalLeaving(portfolioLabel), value: figure(amount + fee) }
      : { label: copy.terms.arrives(portfolioLabel), value: figure(amount - fee) },
    reasons: [
      ...(cost.kind === "relayer" && cost.opens ? [copy.openingReason] : []),
      ...(!depositing && cost.kind === "relayer" ? [copy.fromProceeds] : []),
    ],
    notNow:
      network.tone === "warning" && network.explanation.length > 0 ? network.explanation[0] : null,
    needsCash: network.moveMoney
      ? { text: network.moveMoney.before.trim(), action: network.moveMoney.link }
      : null,
    risk: depositing ? { line: copy.depositRisk(state.venue), link: copy.readRisks } : null,
    pendingNote: state.pending.note,
    confirm: {
      label: copy.confirm[action](figure(amount)),
      disabled: network.confirmDisabled || !state.online,
    },
  };
}

/** The sheet's progress step, while the transaction is sent and read back. */
export function earnProgressView(action: EarnAction, amount: number) {
  const [sending, confirming, reading] = copy.steps;
  return {
    title: copy.progress[action](symbolAmount(CASH, amount)),
    steps: [
      { key: "send", title: sending, status: "current" as const },
      { key: "confirm", title: confirming, status: "waiting" as const },
      { key: "read", title: reading, status: "waiting" as const },
    ],
  };
}

/** The sheet's result step. A withdrawal states what arrived after its cost. */
export function earnResultView(state: {
  action: EarnAction;
  outcome: "landed" | "unknown";
  amount: number;
  fee: number;
  portfolioLabel: string;
}) {
  const { action, portfolioLabel } = state;
  if (state.outcome === "unknown") {
    return {
      title: copy.unknownTitle,
      body: copy.unknownBody(portfolioLabel),
      close: commonCopy.close,
    };
  }
  const moved = action === "deposit" ? state.amount : state.amount - state.fee;
  return {
    title: copy.landed[action](symbolAmount(CASH, moved)),
    body: copy.landedBody[action](portfolioLabel),
    close: commonCopy.done,
  };
}
