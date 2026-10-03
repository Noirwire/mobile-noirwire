import { pieCopy } from "@noirwire/shared/copy";
import { MAX_SLICES, evenSplit, type PieSlice } from "@noirwire/shared/domain";
import { asset, pieProblem } from "@noirwire/shared/wallet";
import { mobilePieCopy as copy } from "./copy";

/**
 * Building a pie's mix: the rules for targets and what the builder says about
 * them. A mobile model: a candidate to move into @noirwire/shared.
 */

export type Mix = {
  slices: PieSlice[];
  /** While true, the mix stays an even split as trackers come and go. */
  even: boolean;
};

const STEP = 5;

function isEvenSplit(slices: PieSlice[]) {
  if (slices.length === 0) return true;
  const even = evenSplit(slices.map((slice) => slice.symbol));
  return even.every((slice, index) => slice.weight === slices[index].weight);
}

export function mixFrom(slices: readonly PieSlice[] | undefined): Mix {
  const copied = (slices ?? []).map((slice) => ({ ...slice }));
  return { slices: copied, even: isEvenSplit(copied) };
}

export type MixChange =
  | { type: "add"; symbol: string }
  | { type: "remove"; symbol: string }
  | { type: "set"; symbol: string; weight: number }
  | { type: "splitEvenly" };

/** A typed target is a whole number from 0 to 100. */
export function wholePercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function changeMix(mix: Mix, change: MixChange): Mix {
  const symbols = mix.slices.map((slice) => slice.symbol);
  switch (change.type) {
    case "add":
      if (symbols.includes(change.symbol) || symbols.length >= MAX_SLICES) return mix;
      return mix.even
        ? { slices: evenSplit([...symbols, change.symbol]), even: true }
        : { slices: [...mix.slices, { symbol: change.symbol, weight: 0 }], even: false };
    case "remove": {
      const rest = mix.slices.filter((slice) => slice.symbol !== change.symbol);
      return mix.even
        ? { slices: evenSplit(rest.map((slice) => slice.symbol)), even: true }
        : { ...mix, slices: rest };
    }
    case "set":
      return {
        even: false,
        slices: mix.slices.map((slice) =>
          slice.symbol === change.symbol
            ? { ...slice, weight: wholePercent(change.weight) }
            : slice,
        ),
      };
    case "splitEvenly":
      return { slices: evenSplit(symbols), even: true };
  }
}

function problemMessage(slices: PieSlice[]): string | null {
  const problem = pieProblem(slices);
  if (!problem) return null;
  const words = copy.problems;
  switch (problem.reason) {
    case "empty":
      return words.empty;
    case "tooMany":
      return words.tooMany(problem.max);
    case "repeated":
      return words.repeated;
    case "unlisted":
      return words.unlisted;
    case "retired":
      return words.retired(problem.symbol);
    case "weight":
      return words.weight;
    case "total":
      return words.total(problem.total);
  }
}

export function mixView(mix: Mix) {
  const total = mix.slices.reduce((sum, slice) => sum + slice.weight, 0);
  const b = pieCopy.builder;
  const caption =
    total === 100
      ? b.fullyAllocated
      : total < 100
        ? b.leftToPlace(100 - total)
        : b.over(total - 100);
  return {
    count: mix.slices.length,
    ring: {
      target: mix.slices.map((slice) => slice.weight),
      label: copy.builder.ringLabel(
        mix.slices.length,
        mix.slices.map((slice) => copy.builder.sliceSpoken(slice.symbol, slice.weight)).join(", "),
      ),
    },
    total: {
      text: b.total(total),
      warning: total !== 100,
      caption,
      spoken: copy.builder.totalSpoken(total, caption),
    },
    splitEvenly: mix.slices.length >= 2 && !isEvenSplit(mix.slices) ? b.splitEvenly : null,
    rows: mix.slices.map((slice) => ({
      symbol: slice.symbol,
      name: asset(slice.symbol)?.name ?? slice.symbol,
      weight: slice.weight,
      stepLabel: b.shareLabel(slice.symbol),
      removeLabel: b.remove(slice.symbol),
    })),
    step: STEP,
    chooser:
      mix.slices.length < MAX_SLICES
        ? { label: mix.slices.length === 0 ? copy.builder.pickTrackers : copy.builder.addAnother }
        : null,
    problem: problemMessage(mix.slices),
  };
}
