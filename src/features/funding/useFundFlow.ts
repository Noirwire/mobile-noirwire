import {
  FUNDING,
  awaitPrivateArrival,
  fundPrivately,
  fundingDraft,
} from "@noirwire/shared/application";
import { activePortfolios, cashOf } from "@noirwire/shared/wallet";
import { describeFailure } from "@noirwire/shared/presentation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServices } from "../services";
import { useMoney } from "../network/money";
import { usePendingBlock } from "../network/usePendingBlock";
import { useWalletSnapshot } from "../network/useWalletSnapshot";

export type FundStep = "choose" | "amount" | "review" | "progress" | "result";

/** The token the private route moves. */
export const CASH = "USDC";
const USDC_DECIMALS = 6;
/** How long progress may run before it says that nothing more is needed (spec 3.2). */
export const STILL_WORKING_MS = 20_000;

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
  const [amountText, setAmountText] = useState("");
  const [read, setRead] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [completed, setCompleted] = useState(0);
  /** Each Confirm starts a run; the one whose progress has gone on long enough says so. */
  const [run, setRun] = useState(0);
  const [slowRun, setSlowRun] = useState<number | null>(null);
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
    money.refresh
      .funding(fundingAddress, CASH)
      .catch(() => undefined)
      .finally(() => current && setRead(true));
    return () => {
      current = false;
    };
  }, [money, fundingAddress]);

  useEffect(() => {
    if (step !== "progress") return;
    const timer = setTimeout(() => setSlowRun(run), STILL_WORKING_MS);
    return () => clearTimeout(timer);
  }, [step, run]);
  const slow = step === "progress" && slowRun === run;

  const portfolio = portfolios.find((entry) => entry.id === chosen) ?? null;
  const fundingBalance = read && wallet ? (wallet.funding.tokens[CASH] ?? 0) : null;
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
    setRun((count) => count + 1);
    setStep("progress");
    const deps = {
      ...money.deps,
      asset: money.asset,
      privateToken: money.privateToken,
      refresh: money.refresh,
    };
    const sent = await fundPrivately(deps, { portfolioId: id, amount, symbol: CASH });
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
    });
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
    setAmountText,
    fundingBalance,
    draft,
    failure,
    completed,
    slow,
    result,
    goTo: setStep,
    confirm,
  };
}

export type FundFlow = ReturnType<typeof useFundFlow>;
