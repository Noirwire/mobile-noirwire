import type { Step } from "@/ui";

/** What the import screen says while it works and when it cannot finish. */
export const importProgressCopy = {
  title: "Importing your wallet",
  lead: "Keep the app open. This usually takes a few seconds.",
  steps: ["Reading your recovery phrase", "Finding your portfolios", "Getting everything ready"],
  slow: "Still working. A wallet with many portfolios takes a little longer.",
  failed: "We couldn't finish importing your wallet. Nothing was saved on this phone. Try again.",
} as const;

/** How many times the lookup is tried before the screen says it could not finish. */
export const IMPORT_ATTEMPTS = 3;
export const RETRY_PAUSE_MS = 1_500;
/** When the list moves from finding portfolios to the last step, so progress is visible on a long lookup. */
export const LAST_STEP_AFTER_MS = 6_000;

/** The progress list: the phrase is already read, and the lookup is under way. */
export function importSteps(lastStepReached: boolean): Step[] {
  const [reading, finding, readying] = importProgressCopy.steps;
  return [
    { key: "reading", title: reading, status: "done" },
    { key: "finding", title: finding, status: lastStepReached ? "done" : "current" },
    { key: "readying", title: readying, status: lastStepReached ? "current" : "waiting" },
  ];
}

/** Runs `attempt` until it succeeds, pausing between tries; the last failure is thrown. */
export async function withRetries<T>(
  attempt: () => Promise<T>,
  tries: number = IMPORT_ATTEMPTS,
  pauseMs: number = RETRY_PAUSE_MS,
): Promise<T> {
  for (let tried = 1; ; tried++) {
    try {
      return await attempt();
    } catch (error) {
      if (tried >= tries) throw error;
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }
}
