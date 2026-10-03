import type { LegOutcome } from "@noirwire/shared/application";
import { pieCopy } from "@noirwire/shared/copy";
import { planRebalanceSells, usd, type SliceState } from "@noirwire/shared/domain";
import { legOutcomeView, pieProgressHeadline } from "@noirwire/shared/presentation";
import type { Step, StepStatus } from "@/ui";
import { mobilePieCopy as copy } from "./copy";

/**
 * A pie order's mobile rules: the smallest amount a mix can be invested
 * with, which drifts are worth selling, and the progress list. Candidates to
 * move into @noirwire/shared.
 */

type Slice = Pick<SliceState, "symbol" | "weight" | "value">;

/**
 * The share of `cash` each slice would receive, by the same rule the split
 * itself uses: in proportion to how far each sits below its target once the
 * new cash is counted.
 */
function splitShares(cash: number, slices: readonly Slice[]): number[] {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) + cash;
  const shortfalls = slices.map((slice) => Math.max((total * slice.weight) / 100 - slice.value, 0));
  const sum = shortfalls.reduce((acc, value) => acc + value, 0);
  return sum > 0 ? shortfalls.map((value) => value / sum) : [];
}

/**
 * The least that can be invested in this mix right now so every order of the
 * split reaches the smallest order the venue places, rounded up to the next
 * dollar; null when `cash` already does. Approximate by nature: the real
 * answer comes with the quotes.
 */
export function investFloor(
  cash: number,
  slices: readonly Slice[],
  smallest: number,
): number | null {
  if (!(cash > 0)) return null;
  const shares = splitShares(cash, slices).filter((share) => share > 0);
  if (shares.length === 0) return null;
  const least = Math.min(...shares);
  if (cash * least >= smallest) return null;
  return Math.ceil(smallest / least);
}

export function floorLines(floor: number | null) {
  if (floor === null) return null;
  const amount = usd(floor);
  return { text: copy.order.floor(amount), use: copy.order.useAmount(amount), amount: floor };
}

/** A rebalance sells only what sits above target by at least the smallest order, never more than is held. */
export function rebalanceSells(slices: SliceState[], smallest: number) {
  const all = planRebalanceSells(slices);
  const sells = all.filter((leg) => leg.usd >= smallest);
  return { sells, leftAlone: sells.length < all.length ? copy.order.smallerLeftAlone : null };
}

const STATUS: Record<LegOutcome["status"], StepStatus> = {
  waiting: "waiting",
  placing: "current",
  done: "done",
  failed: "failed",
  "not placed": "skipped",
};

/** One StepList item per order, with its status word and, when it stopped, why. */
export function legSteps(
  outcomes: readonly LegOutcome[],
  nameOf: (symbol: string) => string,
): Step[] {
  return outcomes.map((outcome) => {
    const said = legOutcomeView(outcome);
    return {
      key: outcome.symbol,
      title: nameOf(outcome.symbol),
      status: STATUS[outcome.status],
      statusLabel: pieCopy.order.status[outcome.status],
      ...(said.note ? { caption: said.note } : {}),
      ...(said.error ? { reason: said.error } : {}),
    };
  });
}

/** The result's headline: no order placed reads as exactly that, never "0 of 4". */
export function resultHeadline(outcomes: readonly LegOutcome[]) {
  const placed = outcomes.filter((outcome) => outcome.status === "done").length;
  return placed === 0 ? pieCopy.order.nonePlaced : pieProgressHeadline({ kind: "done" }, outcomes);
}

/** Whether the run stopped before every order was placed. */
export function runStopped(outcomes: readonly LegOutcome[]) {
  return outcomes.some((outcome) => outcome.status !== "done");
}
