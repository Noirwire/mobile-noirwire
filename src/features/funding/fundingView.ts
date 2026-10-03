import type { fundingDraft } from "@noirwire/shared/application";
import { commonCopy } from "@noirwire/shared/copy";
import { PRIVACY_FEE_BPS, SETTLEMENT_DELAY_MS, symbolAmount } from "@noirwire/shared/domain";
import {
  fundingAmountView,
  fundingOutcomeView,
  fundingProgressView,
  fundingReviewView,
  type StageStatus,
} from "@noirwire/shared/presentation";
import type { StepStatus } from "@/ui";
import { mobileFundingCopy as copy } from "./copy";

/**
 * The fund sheet's view models (spec 2.16): the shared ones for the rules
 * and the figures, with the phone's wording where it differs. Candidates to
 * move into @noirwire/shared/presentation as a mobile variant.
 */

type FundingDraft = ReturnType<typeof fundingDraft>;

const ASSET = "USDC";
const PRIVACY_FEE_PERCENT = PRIVACY_FEE_BPS / 100;
/** The chips under the amount, in USDC. */
export const FUND_PRESETS = [10, 25, 50, 100] as const;

/** What can stop the sheet besides what was typed. */
export type FundGuards = {
  online: boolean;
  pending: { blocked: boolean };
};

type Term = { label: string; value: string };

export type FundAmountView = {
  lead: string;
  available: { label: string; value: string | null };
  presets: readonly { value: number; label: string; disabled: boolean }[];
  amountLabel: string;
  placeholder: string;
  terms: readonly Term[];
  total: Term;
  validation: string | null;
  costs: string;
  review: { label: string; disabled: boolean };
  footer: string;
  empty: { title: string; detail: string; action: string } | null;
};

const signed = (value: number) => `+ ${symbolAmount(ASSET, value)}`;

/** Step 1: how much, and plain arithmetic of what it takes from the funding wallet. */
export function fundAmountView(
  state: {
    draft: FundingDraft;
    portfolioLabel: string;
    /** Null until the funding wallet has been read on open. */
    fundingBalance: number | null;
    amountText: string;
  } & FundGuards,
): FundAmountView {
  const { draft, portfolioLabel, fundingBalance } = state;
  const shared = fundingAmountView({
    draft,
    asset: ASSET,
    privateRoute: true,
    fundingBalance: fundingBalance ?? 0,
    amountText: state.amountText,
    presets: FUND_PRESETS,
    pending: state.pending,
  });
  const typed = Number.isFinite(draft.customAmount) && draft.customAmount > 0;
  const amount = typed ? draft.customAmount : 0;
  const costs = draft.costsOf(amount);
  return {
    lead: copy.lead(portfolioLabel),
    available: {
      label: copy.available,
      value: fundingBalance === null ? null : symbolAmount(ASSET, fundingBalance),
    },
    presets: shared.presets.map((preset) => ({
      ...preset,
      label: String(preset.value),
      disabled: preset.disabled || fundingBalance === null,
    })),
    amountLabel: copy.amountLabel,
    placeholder: commonCopy.amountPlaceholder,
    terms: [
      { label: copy.terms.arrives(portfolioLabel), value: symbolAmount(ASSET, amount) },
      { label: copy.terms.privacyFee(PRIVACY_FEE_PERCENT), value: signed(costs.privacyFee) },
      { label: copy.terms.relayFee, value: signed(costs.relayFee) },
    ],
    total: { label: copy.terms.leaves, value: symbolAmount(ASSET, costs.total) },
    validation: shared.invalid ?? shared.unaffordable,
    costs: copy.costs(symbolAmount(ASSET, draft.minimum)),
    review: {
      label: copy.review,
      disabled: shared.next.disabled || !state.online || fundingBalance === null,
    },
    footer: copy.footer,
    empty:
      fundingBalance !== null && fundingBalance <= 0
        ? { title: copy.empty, detail: copy.emptyDetail, action: copy.showAddress }
        : null,
  };
}

export type FundReviewView = {
  title: string;
  lead: string;
  terms: readonly Term[];
  total: Term;
  /** How the total is read out: "Total leaving your funding wallet, 100 point 30 USDC". */
  totalAnnouncement: string;
  notSignedAbove: string;
  confirm: { label: string; disabled: boolean };
};

/** Step 2: exactly what leaves the funding wallet, to the token's last non-zero decimal. */
export function fundReviewView(
  state: { draft: FundingDraft; amount: number; portfolioLabel: string } & FundGuards,
): FundReviewView {
  const shared = fundingReviewView({ ...state, asset: ASSET });
  const terms = shared.terms.slice(0, -1);
  const total = shared.terms[shared.terms.length - 1];
  return {
    title: copy.reviewTitle,
    lead: shared.lead,
    terms,
    total,
    totalAnnouncement: `${total.label}, ${total.value.replace(".", " point ")}`,
    notSignedAbove: copy.notSignedAbove,
    confirm: { label: shared.confirm.label, disabled: shared.confirm.disabled || !state.online },
  };
}

const STEP_STATUS: Record<StageStatus, StepStatus> = {
  pending: "waiting",
  running: "current",
  done: "done",
};

/** Step 3: where the transfer is, by how many stages have evidence. */
export function fundProgressView(state: {
  amount: number;
  portfolioLabel: string;
  completed: number;
  slow: boolean;
}) {
  const shared = fundingProgressView({ ...state, asset: ASSET });
  const [sent, queue, arrived] = copy.stages;
  const titles = [sent.title, queue.title, arrived.title(state.portfolioLabel)];
  const captions = [
    sent.caption,
    queue.caption(SETTLEMENT_DELAY_MS.min / 1000, SETTLEMENT_DELAY_MS.max / 1000),
    arrived.caption,
  ];
  return {
    title: shared.title,
    steps: shared.stages.map((stage, index) => ({
      key: String(index),
      title: titles[index],
      caption: captions[index],
      status: STEP_STATUS[stage.status],
    })),
    stillWorking: state.slow ? copy.stillWorking : null,
  };
}

export type FundOutcome = "done" | "pending" | "unknown";

export type FundOutcomeView = {
  title: string;
  body: string;
  publicView: string | null;
  close: string;
  tone: "success" | "warning";
};

/** Step 4: how it ended, as far as the portfolio's real balance shows. */
export function fundOutcomeView(state: {
  outcome: FundOutcome;
  amount: number;
  arrived: number;
  fee: number;
  portfolioLabel: string;
}): FundOutcomeView {
  const shared = fundingOutcomeView({ ...state, asset: ASSET, privateRoute: true });
  if (state.outcome !== "done") {
    return {
      title: shared.title,
      body: shared.body,
      publicView: null,
      close: shared.close,
      tone: "warning",
    };
  }
  const fees =
    state.fee > 0
      ? copy.feesCharged(
          `${state.fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${ASSET}`,
        )
      : "";
  return {
    title: shared.title,
    body: `${copy.arrived(symbolAmount(ASSET, state.arrived), state.portfolioLabel)}${fees}`,
    publicView: copy.seePublicView,
    close: shared.close,
    tone: "success",
  };
}

export type ChoosePortfolioView = {
  title: string;
  rows: readonly { id: string; label: string; cash: string }[];
  next: { label: string; disabled: boolean };
};

/** The step before the amount, when the sheet opens with more than one portfolio to fund. */
export function choosePortfolioView(state: {
  portfolios: readonly { id: string; label: string; cash: number }[];
  chosen: string | null;
}): ChoosePortfolioView {
  const chosen = state.portfolios.find((portfolio) => portfolio.id === state.chosen);
  return {
    title: copy.chooseTitle,
    rows: state.portfolios.map((portfolio) => ({
      id: portfolio.id,
      label: portfolio.label,
      cash: copy.cash(symbolAmount(ASSET, portfolio.cash)),
    })),
    next: {
      label: chosen ? copy.continueWith(chosen.label) : commonCopy.continue,
      disabled: !chosen,
    },
  };
}
