import { costAgreed, reviewSend, send, sendDraft } from "@noirwire/shared/application";
import { classifyRecipient, type NetworkCost } from "@noirwire/shared/domain";
import { isOffCurveAddress, isRecipientAddress } from "@noirwire/shared/infrastructure";
import { describeFailure } from "@noirwire/shared/presentation";
import { isLivePrice, isPosition, price, unitsPerHeld } from "@noirwire/shared/wallet";
import { useEffect, useRef, useState } from "react";
import { useServices } from "../services";
import { phoneCost } from "../network/cost";
import { useMoney } from "../network/money";
import { usePendingBlock } from "../network/usePendingBlock";
import { useWalletSnapshot } from "../network/useWalletSnapshot";
import { mobileSendCopy } from "./copy";
import { hasForeignCharacters, recipientFromCode, type Unsendable } from "./recipientCheck";
import { sendAssets, type SendStage } from "./sendView";

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
  const [outcome, setOutcome] = useState<{ kind: "landed" | "unknown"; amount: number } | null>(
    null,
  );
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );

  const heldRaw = portfolio?.holdings.find((holding) => holding.symbol === symbol)?.amount ?? 0;
  const units = unitsPerHeld(symbol);
  const destination = recipient.trim();
  const offCurve = isOffCurveAddress(destination);
  const ownAddress = portfolio?.address ?? "";
  const draft = sendDraft({
    heldRaw,
    unitsPerHeld: units,
    amountText,
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
    setReviewNotice(null);
    setChecks({ checkedAddress: false, acceptedLink: false, lastFour: "" });
    const read = await readRecipient();
    if (read !== "ok") {
      setPreparing(false);
      return;
    }
    const next = await priced();
    if (!live.current) return;
    setPreparing(false);
    setReview(next);
    setStep("review");
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
    const changed = await recheck(review);
    if (!live.current) return;
    if (changed === "refused") {
      setStep("details");
      return;
    }
    if (changed) {
      setReview(changed);
      setReviewNotice(mobileSendCopy.recipientChanged);
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
    );
    if (!live.current) return;
    if (result.kind === "confirmed" || result.kind === "unknown") {
      setOutcome({
        kind: result.kind === "confirmed" ? "landed" : "unknown",
        amount: review.amount,
      });
      setStep("result");
      return;
    }
    const failed = describeFailure(result);
    if (failed.reviewAgain) setReview(await priced(failed.reviewAgain === "other"));
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
    classification: classifyRecipient(destination, wallet),
    pricePerHeld: isLivePrice(symbol) ? price(symbol) : null,
    paste,
    scanned,
    openReview,
    confirm,
  };
}

export type SendFlow = ReturnType<typeof useSendFlow>;
