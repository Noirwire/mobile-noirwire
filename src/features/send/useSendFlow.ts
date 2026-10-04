import {
  balancesUnread,
  costAgreed,
  reviewSend,
  send,
  sendDraft,
} from "@noirwire/shared/application";
import { sendCopy } from "@noirwire/shared/copy";
import {
  classifyRecipient,
  hasForeignCharacters,
  type NetworkCost,
  type Unsendable,
} from "@noirwire/shared/domain";
import {
  isOffCurveAddress,
  isRecipientAddress,
  recipientFromCode,
} from "@noirwire/shared/infrastructure";
import { describeFailure, sendAssets, type SendStage } from "@noirwire/shared/presentation";
import { isLivePrice, isPosition, price, unitsPerHeld } from "@noirwire/shared/wallet";
import { useEffect, useRef, useState } from "react";
import { useWaiting, WAITING_LIMIT_MS, withinLimit } from "@/ui/useWaiting";
import { phoneCopy } from "../phoneCopy";
import { useServices } from "../services";
import { phoneCost } from "../network/cost";
import { assetDecimals } from "../network/decimals";
import { useMoney } from "../network/money";
import { usePendingBlock } from "../network/usePendingBlock";
import { useWalletSnapshot } from "../network/useWalletSnapshot";

export type SendStep = "details" | "scan" | "review" | "progress" | "result";

type Review = { cost: NetworkCost; amount: number };

/**
 * The send sheet's lifecycle (spec 2.24). The shared use case plans the
 * cost, reserves the portfolio and sends; this hook reads the recipient from
 * the network at "Review" and again before signing, and steps the sheet.
 */
export function useSendFlow(portfolioId: string) {
  const money = useMoney();
  const { useOnline, readClipboard } = useServices();
  const online = useOnline();
  const wallet = useWalletSnapshot();
  const pending = usePendingBlock(portfolioId);
  const portfolio = wallet?.portfolios.find((entry) => entry.id === portfolioId) ?? null;
  const assets = sendAssets(portfolio?.holdings ?? [], isPosition);

  const [step, setStep] = useState<SendStep>("details");
  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? "");
  const [recipient, setRecipientText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [pastedForeign, setPastedForeign] = useState(false);
  const [scanNotice, setScanNotice] = useState(false);
  const [scanRefused, setScanRefused] = useState(false);
  const [unsendable, setUnsendable] = useState<Unsendable | null>(null);
  const [recipientUnreadable, setRecipientUnreadable] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [checks, setChecks] = useState({
    checkedAddress: false,
    acceptedLink: false,
    lastFour: "",
  });
  const [stage, setStage] = useState<SendStage>("checking");
  const [outcome, setOutcome] = useState<{
    kind: "landed" | "unknown";
    amount: number;
    /** It landed, and the new balance could not be read back yet. */
    balancesUnread: boolean;
  } | null>(null);
  /** Why a review could not be prepared, said on the form. */
  const [prepareFailure, setPrepareFailure] = useState<string | null>(null);
  const working = useWaiting(step === "progress", "action");
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );

  const heldRaw = portfolio?.holdings.find((holding) => holding.symbol === symbol)?.amount ?? 0;
  const units = unitsPerHeld(symbol);
  const decimals = assetDecimals(symbol);
  const destination = recipient.trim();
  const offCurve = isOffCurveAddress(destination);
  const ownAddress = portfolio?.address ?? "";
  const draft = sendDraft({
    heldRaw,
    unitsPerHeld: units,
    amountText,
    decimals,
    destination,
    isAddress: isRecipientAddress(destination),
    offCurve,
    ownAddress,
  });
  const sendInput = { symbol, amount: draft.rawAmount, to: destination };

  function setRecipient(text: string) {
    setRecipientText(text);
    setUnsendable(null);
    setRecipientUnreadable(false);
    setScanNotice(false);
  }

  async function paste() {
    const text = (await readClipboard().catch(() => "")).trim();
    setRecipient(text);
    setRecipientTouched(true);
    setPastedForeign(text !== "" && hasForeignCharacters(text));
  }

  /** A scanned code: its address is taken and the sheet goes back, or the scanner stays open. */
  function scanned(text: string): boolean {
    const found = recipientFromCode(text);
    if (!found) {
      setScanRefused(true);
      return false;
    }
    setRecipient(found.address);
    setRecipientTouched(true);
    setPastedForeign(false);
    setScanNotice(found.fromPaymentCode);
    setScanRefused(false);
    setStep("details");
    return true;
  }

  async function readRecipient(): Promise<"ok" | "refused" | "unreadable"> {
    try {
      const kind = await money.checkRecipient(destination);
      setUnsendable(kind);
      return kind ? "refused" : "ok";
    } catch {
      setRecipientUnreadable(true);
      return "unreadable";
    }
  }

  async function priced(withoutRelayer = false): Promise<Review> {
    const planned = await reviewSend(
      { ...money.deps, chain: money.sendChain },
      {
        portfolioId,
        send: sendInput,
        withoutRelayer,
      },
    );
    return { cost: phoneCost(planned.cost), amount: planned.amount };
  }

  async function openReview() {
    setRecipientTouched(true);
    setAmountTouched(true);
    setPreparing(true);
    setFailure(null);
    setPrepareFailure(null);
    setReviewNotice(null);
    setChecks({ checkedAddress: false, acceptedLink: false, lastFour: "" });
    // The recipient is read and the cost worked out within the review's
    // limit: one that does not answer ends here, with the form usable again.
    try {
      const next = await withinLimit(
        readRecipient().then((read) => (read === "ok" ? priced() : null)),
        WAITING_LIMIT_MS.review,
      );
      if (!live.current) return;
      setPreparing(false);
      if (!next) return;
      setReview(next);
      setStep("review");
    } catch {
      if (!live.current) return;
      setPreparing(false);
      setPrepareFailure(phoneCopy.overdue.review);
    }
  }

  /**
   * Reads the recipient again immediately before signing. Something that
   * cannot receive refuses the send; an account opened or closed meanwhile
   * changes the cost, and the review is shown again with the new one.
   */
  async function recheck(current: Review): Promise<Review | "refused" | null> {
    if ((await readRecipient()) !== "ok") return "refused";
    const next = await priced();
    const opensBefore = current.cost.kind === "relayer" ? current.cost.opens : null;
    const opensNow = next.cost.kind === "relayer" ? next.cost.opens : null;
    return opensBefore === opensNow ? null : next;
  }

  async function confirm() {
    if (!review) return;
    setFailure(null);
    setReviewNotice(null);
    setStage("checking");
    setStep("progress");
    let changed: Awaited<ReturnType<typeof recheck>>;
    try {
      changed = await withinLimit(recheck(review), WAITING_LIMIT_MS.review);
    } catch {
      // Nothing has been signed yet: the review comes back and says so.
      if (!live.current) return;
      setFailure(phoneCopy.overdue.review);
      setStep("review");
      return;
    }
    if (!live.current) return;
    if (changed === "refused") {
      setStep("details");
      return;
    }
    if (changed) {
      setReview(changed);
      setReviewNotice(sendCopy.recipientChanged);
      setStep("review");
      return;
    }
    setStage("sending");
    const result = await send(
      { ...money.deps, chain: money.sendChain },
      {
        portfolioId,
        send: { ...sendInput, amount: review.amount },
        network: costAgreed(review.cost),
      },
      // Thrown past the use case's own answers: whether it was sent is not known.
    ).catch((): Awaited<ReturnType<typeof send>> => ({ kind: "unknown", completed: [] }));
    if (!live.current) return;
    if (result.kind === "confirmed" || result.kind === "unknown") {
      setOutcome({
        kind: result.kind === "confirmed" ? "landed" : "unknown",
        amount: review.amount,
        balancesUnread: balancesUnread(result),
      });
      setStep("result");
      return;
    }
    const failed = describeFailure(result, "mobile");
    if (failed.reviewAgain) {
      const again = await withinLimit(
        priced(failed.reviewAgain === "other"),
        WAITING_LIMIT_MS.review,
      ).catch(() => null);
      if (!live.current) return;
      if (again) setReview(again);
    }
    setFailure(failed.error);
    setStep("review");
  }

  return {
    step,
    goTo: setStep,
    online,
    pending,
    wallet,
    portfolio,
    assets,
    symbol,
    chooseAsset(next: string) {
      setSymbol(next);
      setAmountText("");
      setAmountTouched(false);
    },
    recipient,
    setRecipient,
    touchRecipient: () => setRecipientTouched(true),
    amountText,
    setAmountText,
    touchAmount: () => setAmountTouched(true),
    recipientTouched,
    amountTouched,
    pastedForeign,
    scanNotice,
    scanRefused,
    unsendable,
    recipientUnreadable,
    preparing,
    heldRaw,
    units,
    decimals,
    destination,
    offCurve,
    ownAddress,
    draft,
    review,
    reviewNotice,
    failure,
    checks,
    setChecks,
    stage,
    outcome,
    prepareFailure,
    /** The progress step's wait: its calm line, and whether it has run past its limit. */
    working,
    classification: classifyRecipient(destination, wallet),
    pricePerHeld: isLivePrice(symbol) ? price(symbol) : null,
    paste,
    scanned,
    openReview,
    confirm,
  };
}

export type SendFlow = ReturnType<typeof useSendFlow>;
