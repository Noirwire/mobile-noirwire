/**
 * The phone's phrase quiz (spec 2.4): three positions drawn at random when an
 * attempt starts, asked in ascending order, four choices each. A wrong pick
 * keeps the question and disables that choice; the third wrong pick in one
 * attempt starts a new attempt with new positions, so the quiz cannot be
 * passed by elimination. The web app's quiz sends a wrong pick back to the
 * phrase instead, which is why this lives here. A candidate to move into
 * @noirwire/shared as the mobile quiz rules.
 */

export const QUESTIONS = 3;
export const CHOICES = 4;
export const MISSES_PER_ATTEMPT = 3;

/** A uniform whole number from 0 up to, not including, `bound`. */
export type RandomIndex = (bound: number) => number;

export const cryptoRandomIndex: RandomIndex = (bound) => {
  const limit = Math.floor(0x1_0000_0000 / bound) * bound;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0] >= limit);
  return value[0] % bound;
};

export type Quiz = {
  /** Zero-based positions asked in this attempt, ascending. */
  positions: number[];
  /** Index into `positions` of the question on screen. */
  step: number;
  choices: string[];
  /** Choices picked wrongly for the question on screen. */
  disabled: string[];
  /** Wrong picks in this attempt. */
  misses: number;
  /** The one-based position the last wrong pick was about, for "Check word 7". */
  hint: number | null;
  /** True after the third miss, until the new attempt's first question is shown. */
  restarted: boolean;
  passed: boolean;
};

function shuffle<T>(items: readonly T[], random: RandomIndex): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** The answer and three other words of the phrase, in random order. A word repeated in the phrase is offered once. */
function choicesFor(words: readonly string[], position: number, random: RandomIndex): string[] {
  const answer = words[position];
  const others = shuffle(
    [...new Set(words)].filter((word) => word !== answer),
    random,
  );
  return shuffle([answer, ...others.slice(0, CHOICES - 1)], random);
}

export function newAttempt(
  words: readonly string[],
  random: RandomIndex = cryptoRandomIndex,
): Quiz {
  const positions = shuffle(
    words.map((_, index) => index),
    random,
  )
    .slice(0, QUESTIONS)
    .sort((a, b) => a - b);
  return {
    positions,
    step: 0,
    choices: choicesFor(words, positions[0], random),
    disabled: [],
    misses: 0,
    hint: null,
    restarted: false,
    passed: false,
  };
}

export type PickOutcome = "correct" | "wrong" | "restarted" | "passed";

export function pick(
  quiz: Quiz,
  word: string,
  words: readonly string[],
  random: RandomIndex = cryptoRandomIndex,
): { quiz: Quiz; outcome: PickOutcome } {
  const position = quiz.positions[quiz.step];
  if (words[position] === word) {
    const step = quiz.step + 1;
    if (step === QUESTIONS)
      return { quiz: { ...quiz, passed: true, hint: null }, outcome: "passed" };
    return {
      quiz: {
        ...quiz,
        step,
        choices: choicesFor(words, quiz.positions[step], random),
        disabled: [],
        hint: null,
      },
      outcome: "correct",
    };
  }
  const misses = quiz.misses + 1;
  if (misses >= MISSES_PER_ATTEMPT) {
    return { quiz: { ...newAttempt(words, random), restarted: true }, outcome: "restarted" };
  }
  return {
    quiz: { ...quiz, misses, disabled: [...quiz.disabled, word], hint: position + 1 },
    outcome: "wrong",
  };
}

/** The new attempt's first question replaces the restart notice. */
export function resume(quiz: Quiz): Quiz {
  return { ...quiz, restarted: false };
}
