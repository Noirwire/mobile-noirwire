import type { sendDraft } from "@noirwire/shared/application";
import { commonCopy, sendCopy } from "@noirwire/shared/copy";
import { symbolAmount, type NetworkCost, type RecipientClass } from "@noirwire/shared/domain";
import { sendFormView, sendReviewView } from "@noirwire/shared/presentation";
import { mobileSendCopy as copy } from "./copy";
import type { Unsendable } from "./recipientCheck";

/**
 * The send sheet's view models (spec 2.24): the shared ones decide what can
 * be reviewed and confirmed, and these word it as the phone does. Candidates
 * to move into @noirwire/shared/presentation as a mobile variant.
 */

type SendDraft = ReturnType<typeof sendDraft>;

const CASH = "USDC";

export type AssetChoice = { symbol: string; label: string };

/** Cash and one chip per tracker held. Anything else the address holds is not offered here. */
export function sendAssets(
  holdings: readonly { symbol: string; amount: number }[],
  isTracker: (symbol: string) => boolean,
): AssetChoice[] {
  const held = holdings.filter((holding) => holding.amount > 0);
  return [
    ...held
      .filter((holding) => holding.symbol === CASH)
      .map(() => ({ symbol: CASH, label: copy.cash })),
    ...held
      .filter((holding) => isTracker(holding.symbol))
      .map((holding) => ({ symbol: holding.symbol, label: holding.symbol })),
  ];
}

export type SendFormInput = {
  draft: SendDraft;
  symbol: string;
  heldRaw: number;
  unitsPerHeld: number | undefined;
  destination: string;
  ownAddress: string;
  offCurve: boolean;
  recipientTouched: boolean;
  amountTouched: boolean;
  archived: boolean;
  preparing: boolean;
  online: boolean;
  pastedForeign: boolean;
  /** What the network said the recipient is, when it cannot receive. */
  unsendable: Unsendable | null;
  recipientUnreadable: boolean;
};

export type SendFormView = {
  recipientLabel: string;
  recipientPlaceholder: string;
  recipientError: string | null;
  pasteWarning: string | null;
  refusal: string | null;
  amountLabel: string;
  amountPlaceholder: string;
  amountError: string | null;
  available: { label: string; value: string };
  balanceUnavailable: string | null;
  review: { label: string; disabled: boolean };
  explainer: string;
};

/** Step 1: the asset, the recipient and the amount, and whether it can be reviewed. */
export function sendFormViewFor(state: SendFormInput): SendFormView {
  const { draft, symbol } = state;
  const shared = sendFormView({
    ...state,
    offCurveMessage: copy.unsendable.offCurve,
    submitting: false,
    network: "",
  });
  const amountWrong = state.amountTouched && draft.multiplierKnown;
  return {
    recipientLabel: copy.recipientLabel,
    recipientPlaceholder: copy.recipientPlaceholder,
    recipientError:
      shared.recipientError === sendCopy.invalidAddress
        ? copy.invalidAddress
        : shared.recipientError,
    pasteWarning: state.pastedForeign ? copy.pasteWarning : null,
    refusal: state.unsendable
      ? copy.unsendable[state.unsendable]
      : state.recipientUnreadable
        ? copy.recipientUnreadable
        : null,
    amountLabel: copy.amountLabel(symbol),
    amountPlaceholder: commonCopy.amountPlaceholder,
    amountError: !amountWrong
      ? null
      : !draft.validAmount
        ? copy.invalidAmount
        : draft.amount > draft.held
          ? copy.moreThanHeld
          : null,
    available: {
      label: copy.available,
      value: draft.multiplierKnown
        ? symbolAmount(symbol, state.heldRaw * (state.unitsPerHeld ?? 1))
        : commonCopy.unavailable,
    },
    balanceUnavailable: shared.balanceUnavailable,
    review: { label: shared.reviewLabel, disabled: !shared.canReview || !state.online },
    explainer: copy.explainer,
  };
}

/** What "Max" fills: the exact amount held. For cash the review then takes the network cost out of it. */
export function maxAmountText(draft: SendDraft): string {
  return String(draft.held);
}

/** An address in groups of four, the first and last six characters marked to stand out. */
export function addressSegments(address: string): { text: string; strong: boolean }[] {
  const segments: { text: string; strong: boolean }[] = [];
  [...address].forEach((char, index) => {
    const strong = index < 6 || index >= address.length - 6;
    const text = `${index > 0 && index % 4 === 0 ? " " : ""}${char}`;
    const last = segments[segments.length - 1];
    if (last && last.strong === strong) last.text += text;
    else segments.push({ text, strong });
  });
  return segments;
}

/** The address as it is read aloud: groups of four characters. */
export function addressGroups(address: string): string {
  return address.match(/.{1,4}/g)?.join(" ") ?? "";
}

export type SendReviewInput = {
  draft: SendDraft;
  canReview: boolean;
  symbol: string;
  unitsPerHeld: number | undefined;
  destination: string;
  sendAmount: number;
  cost: NetworkCost;
  pricePerHeld: number | null;
  recipient: RecipientClass;
  checks: { checkedAddress: boolean; acceptedLink: boolean; lastFour: string };
  pending: { blocked: boolean; note: string | null };
  online: boolean;
};

export type SendReviewView = {
  title: string;
  recipientLabel: string;
  address: { segments: { text: string; strong: boolean }[]; aria: string };
  terms: readonly { label: string; value: string }[];
  cashNote: string | null;
  costReason: readonly string[];
  costNotNow: string | null;
  needsCash: { text: string; action: string } | null;
  linkWarning: { title: string; body: string; accept: string } | null;
  lookalike: { title: string; previous: string; check: string; confirm: string } | null;
  firstTime: string | null;
  lastFour: { label: string; aria: string } | null;
  pendingNote: string | null;
  irreversible: string;
  reason: string | null;
  confirm: { label: string; disabled: boolean };
};

/** Step 2: what is sent where, what it costs, and every check that can stop a mistake. */
export function sendReviewViewFor(state: SendReviewInput): SendReviewView {
  const { symbol, recipient, checks } = state;
  const shared = sendReviewView({
    ...state,
    pending: { blocked: state.pending.blocked },
    submitting: false,
    network: "",
    solFee: 0,
  });
  const cost = shared.networkCost;
  const terms = shared.terms
    .filter((term) => term.label !== sendCopy.network)
    .map((term) => {
      if (term.label === sendCopy.asset) {
        return symbol === CASH
          ? { label: copy.cash, value: CASH }
          : { label: copy.tracker, value: symbol };
      }
      if (term.label === sendCopy.usdValue) return { label: copy.value, value: term.value };
      return term;
    });
  const reason =
    recipient.kind === "own" && !checks.acceptedLink
      ? copy.reasons.acceptLink
      : recipient.kind === "lookalike" && !checks.checkedAddress
        ? copy.reasons.checkAddress
        : shared.lastFour && checks.lastFour !== state.destination.slice(-4)
          ? copy.reasons.lastFour
          : null;
  return {
    title: copy.reviewTitle,
    recipientLabel: shared.recipient.label,
    address: {
      segments: addressSegments(state.destination),
      aria: copy.recipientAria(addressGroups(state.destination)),
    },
    terms,
    cashNote: shared.cashNote,
    costReason: cost.tone === "neutral" ? cost.explanation : [],
    costNotNow: cost.tone === "warning" && cost.explanation.length > 0 ? cost.explanation[0] : null,
    needsCash: cost.moveMoney
      ? { text: cost.moveMoney.before.trim(), action: cost.moveMoney.link }
      : null,
    linkWarning: shared.linkWarning,
    lookalike: shared.lookalike && {
      title: shared.lookalike.title,
      previous: `${shared.lookalike.previous}${shared.lookalike.address}`,
      check: shared.lookalike.check,
      confirm: shared.lookalike.confirm,
    },
    firstTime: shared.firstTime,
    lastFour: shared.lastFour,
    pendingNote: state.pending.note,
    irreversible: copy.irreversible,
    reason,
    confirm: { label: copy.send, disabled: shared.confirm.disabled || !state.online },
  };
}

export type SendStage = "checking" | "sending";

/** Step 3: the steps of a send, by how far it has got. */
export function sendProgressView(stage: SendStage, amount: string) {
  const [checking, sending, confirming] = copy.steps;
  const sendingNow = stage === "sending";
  return {
    title: copy.sending(amount),
    steps: [
      {
        key: "check",
        title: checking,
        status: sendingNow ? ("done" as const) : ("current" as const),
      },
      {
        key: "send",
        title: sending,
        status: sendingNow ? ("current" as const) : ("waiting" as const),
      },
      { key: "confirm", title: confirming, status: "waiting" as const },
    ],
  };
}

/** Step 4: how it ended. */
export function sendResultView(outcome: "landed" | "unknown", amount: string, portfolio: string) {
  return outcome === "landed"
    ? { title: copy.sent(amount), body: copy.sentBody(portfolio), close: commonCopy.done }
    : {
        title: copy.unknownTitle,
        body: copy.unknownBody(portfolio),
        close: commonCopy.close,
      };
}
