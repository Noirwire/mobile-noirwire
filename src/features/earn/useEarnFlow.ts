import {
  costAgreed,
  earn,
  earnDraft,
  earnSample,
  reviewEarnCost,
  type EarnAction,
} from "@noirwire/shared/application";
import type { NetworkCost } from "@noirwire/shared/domain";
import type { EarnPosition } from "@noirwire/shared/infrastructure";
import { describeFailure, type EarnPortfolio } from "@noirwire/shared/presentation";
import { useEffect, useRef, useState } from "react";
import { useServices } from "../services";
import { phoneCost } from "../network/cost";
import { useMoney } from "../network/money";
import { usePendingBlock } from "../network/usePendingBlock";

export type EarnStep = "choose" | "amount" | "review" | "risks" | "progress" | "result";

export type EarnOpening = { action: EarnAction; portfolioId: string | null };

/**
 * The deposit or withdraw sheet's lifecycle (spec 2.27): choose a portfolio
 * unless one was tapped, an amount, a review with the network cost, one
 * Confirm, progress and a result. The network cost is worked out once a
 * portfolio is chosen, since a deposit's maximum is the cash less that cost.
 */
export function useEarnFlow(
  opening: EarnOpening,
  portfolios: readonly EarnPortfolio[],
  positionOf: (id: string) => EarnPosition | null,
) {
  const money = useMoney();
  const online = useServices().useOnline();
  const { action } = opening;
  const [chosen, setChosen] = useState<string | null>(opening.portfolioId);
  const [step, setStep] = useState<EarnStep>(opening.portfolioId ? "amount" : "choose");
  const [amountText, setAmountText] = useState("");
  /** The network cost, and the portfolio it was worked out for. */
  const [priced, setPriced] = useState<{ for: string; cost: NetworkCost } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<{
    outcome: "landed" | "unknown";
    amount: number;
    fee: number;
  } | null>(null);
  const pending = usePendingBlock(chosen);
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );

  const portfolio = portfolios.find((entry) => entry.id === chosen) ?? null;
  const position = chosen ? positionOf(chosen) : null;
  const cash = portfolio?.cash ?? 0;
  const deposited = position?.deposited;

  async function priceCost(withoutRelayer = false): Promise<NetworkCost> {
    if (!chosen || !position) return { kind: "unavailable" };
    const planned = await reviewEarnCost(
      { ...money.deps, chain: money.earnChain },
      {
        portfolioId: chosen,
        action,
        lamportsNeeded: money.earnVenue.lamportsNeeded(position),
        sample: earnSample(action, cash, deposited),
        withoutRelayer,
      },
    );
    return phoneCost(planned);
  }

  const ready = step !== "choose" && chosen !== null;
  useEffect(() => {
    if (!ready) return;
    let current = true;
    const id = chosen;
    void priceCost().then((next) => current && setPriced({ for: id, cost: next }));
    return () => {
      current = false;
    };
    // The cost is worked out once per chosen portfolio, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, chosen]);

  const cost = ready && priced?.for === chosen ? priced.cost : null;
  const draft = earnDraft({ action, amountText, cash, deposited, cost });

  async function confirm() {
    if (!chosen || !cost) return;
    const amount = draft.amount;
    const fee = cost.kind === "relayer" ? cost.fee : 0;
    setFailure(null);
    setStep("progress");
    const answer = await earn(
      { ...money.deps, chain: money.earnChain, refresh: money.refresh },
      { portfolioId: chosen, action, amount, network: costAgreed(cost) },
    );
    if (!live.current) return;
    if (answer.kind === "confirmed" || answer.kind === "unknown") {
      setResult({ outcome: answer.kind === "confirmed" ? "landed" : "unknown", amount, fee });
      setStep("result");
      return;
    }
    const failed = describeFailure(answer, "mobile");
    if (failed.reviewAgain) {
      setPriced({ for: chosen, cost: await priceCost(failed.reviewAgain === "other") });
    }
    setFailure(failed.error);
    setStep("review");
  }

  return {
    action,
    step,
    goTo: setStep,
    online,
    pending,
    chosen,
    choose: setChosen,
    portfolio,
    amountText,
    setAmountText,
    cost,
    draft,
    failure,
    result,
    confirm,
  };
}

export type EarnFlow = ReturnType<typeof useEarnFlow>;
