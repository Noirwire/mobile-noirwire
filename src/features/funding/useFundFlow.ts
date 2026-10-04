import {
  FUNDING,
  awaitPrivateArrival,
  fundPrivately,
  fundingDraft,
} from "@noirwire/shared/application";
import { hasLoaded } from "@noirwire/shared/domain";
import { activePortfolios, cashOf } from "@noirwire/shared/wallet";
import { describeFailure, WAIT_LIMIT_MS } from "@noirwire/shared/presentation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWaiting, withinLimit } from "@/ui/useWaiting";
import { useServices } from "../services";
import { useBalanceFreshness } from "../network/balanceFreshness";
import { useMoney } from "../network/money";
import { usePendingBlock } from "../network/usePendingBlock";
import { useWalletSnapshot } from "../network/useWalletSnapshot";

export type FundStep = "choose" | "amount" | "review" | "progress" | "result";

/** The token the private route moves. */
export const CASH = "USDC";
const USDC_DECIMALS = 6;

type Result = {
  outcome: "done" | "pending" | "unknown";
  amount: number;
  arrived: number;
  fee: number;
};

/**
 * The fund sheet's lifecycle: choose, amount, review, one Confirm, progress
 * and a result. The shared use case reserves the funding wallet before it
 * signs and watches the portfolio's real balance for the arrival; this hook
 * only steps the sheet along and keeps what was typed.
 */
export function useFundFlow(initialPortfolioId: string | null) {
  const money = useMoney();
  const online = useServices().useOnline();
  const wallet = useWalletSnapshot();
  const pending = usePendingBlock(FUNDING);
  const portfolios = useMemo(() => (wallet ? activePortfolios(wallet) : []), [wallet]);
  const needsChoice = initialPortfolioId === null && portfolios.length > 1;

  const [chosen, setChosen] = useState<string | null>(
    initialPortfolioId ?? (portfolios.length === 1 ? portfolios[0].id : null),
  );
  const [step, setStep] = useState<FundStep>(needsChoice ? "choose" : "amount");
  const [amountText, setAmountTyped] = useState("");
  const [touched, setTouched] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{ attempt: number; ok: boolean } | null>(null);
  const read = answer?.attempt !== attempt ? "reading" : answer.ok ? "read" : "failed";
  const balances = useBalanceFreshness();
  const [failure, setFailure] = useState<string | null>(null);
  const [completed, setCompleted] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );

  const fundingAddress = wallet?.funding.address;
  useEffect(() => {
    if (!fundingAddress) return;
    let current = true;
    withinLimit(money.refresh.funding(fundingAddress, CASH), WAIT_LIMIT_MS.content).then(
      () => current && setAnswer({ attempt, ok: true }),
      () => current && setAnswer({ attempt, ok: false }),
    );
    return () => {
      current = false;
    };
  }, [money, fundingAddress, attempt]);

  const reading = useWaiting(read === "reading", "content");
  const working = useWaiting(step === "progress", "action");

  const portfolio = portfolios.find((entry) => entry.id === chosen) ?? null;
  // A read that failed still shows what this unlock's refresh of every balance read.
  const known = read === "read" || (read === "failed" && hasLoaded(balances));
  const fundingBalance = known && wallet ? (wallet.funding.tokens[CASH] ?? 0) : null;
  const draft = fundingDraft({
    privateRoute: true,
    decimals: USDC_DECIMALS,
    fundingBalance: fundingBalance ?? 0,
    amountText,
  });

  async function confirm() {
    if (!portfolio) return;
    const amount = draft.customAmount;
    const id = portfolio.id;
    setFailure(null);
    setCompleted(0);
    setStep("progress");
    const deps = {
      ...money.deps,
      asset: money.asset,
      privateToken: money.privateToken,
      refresh: money.refresh,
    };
    const sent = await fundPrivately(deps, { portfolioId: id, amount, symbol: CASH }).catch(
      // Thrown past the use case's own answers: whether it was sent is not known.
      () => ({ kind: "unknown" as const }),
    );
    if (!live.current) return;
    if (sent.kind === "unknown") {
      setResult({ outcome: "unknown", amount, arrived: 0, fee: 0 });
      setStep("result");
      return;
    }
    if (sent.kind !== "submitted") {
      setFailure(describeFailure(sent, "mobile").error);
      setStep("amount");
      return;
    }
    setCompleted(1);
    const fee = sent.feeTokens > 0 ? sent.feeTokens : draft.costsOf(amount).total - amount;
    const balance = await awaitPrivateArrival(deps, {
      portfolioId: id,
      symbol: CASH,
      balanceBefore: sent.balanceBefore,
    }).catch(() => null);
    if (!live.current) return;
    if (balance === null) {
      setResult({ outcome: "pending", amount, arrived: 0, fee });
    } else {
      setCompleted(3);
      setResult({ outcome: "done", amount, arrived: balance - sent.balanceBefore, fee });
      void money.refresh.fundingBalances();
    }
    setStep("result");
  }

  return {
    step,
    online,
    pending,
    portfolios: portfolios.map((entry) => ({
      id: entry.id,
      label: entry.label,
      cash: cashOf(entry),
      icon: entry.icon,
    })),
    portfolio,
    chosen,
    choose: setChosen,
    needsChoice,
    amountText,
    setAmountText(text: string) {
      setAmountTyped(text);
      setTouched(true);
    },
    touched,
    decimals: USDC_DECIMALS,
    fundingBalance,
    readFailed: read === "failed",
    /** Reads the funding wallet again after a read that failed. */
    retryRead: () => setAttempt((count) => count + 1),
    balances,
    draft,
    failure,
    completed,
    /** The funding wallet's balance is still being read on opening. */
    stillReading: read === "reading",
    /** The funding wallet's balance being read on opening. */
    reading,
    /** The progress step's wait: its calm line, and whether it has run past its limit. */
    working,
    result,
    goTo: setStep,
    confirm,
  };
}

export type FundFlow = ReturnType<typeof useFundFlow>;
