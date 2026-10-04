import {
  STILL_WORKING_AFTER_MS,
  WAIT_LIMIT_MS,
  WAITING_DELAY_MS,
  waitingView,
  type WaitingKind,
  type WaitingSteps,
  type WaitingView,
} from "@noirwire/shared/presentation";
import { useEffect, useState } from "react";

export type Waiting = WaitingView & {
  /** How long the wait has run, as of the last moment it changed what is shown. */
  elapsedMs: number;
  /** The wait has passed its limit: the screen ends it and offers a way out. */
  overdue: boolean;
};

type Options = {
  /** Further moments, in milliseconds into the wait, at which what is shown may change. */
  moments?: readonly number[];
  /** The steps of multi-step work, shown from the start. */
  steps?: WaitingSteps;
  /** Another limit than the kind's own. */
  limitMs?: number;
};

/**
 * The waiting standard's clock. While `active`, answers what the shared
 * `waitingView` says to show as time passes: nothing for the first 300 ms, a
 * quiet signal after that, and the "still working" line once the wait runs
 * long. It re-renders only at those moments. Every wait in the app reads its
 * signal from here, so they all behave alike.
 */
export function useWaiting(active: boolean, kind: WaitingKind, options: Options = {}): Waiting {
  const limitMs = options.limitMs ?? WAIT_LIMIT_MS[kind];
  const extra = (options.moments ?? []).join(",");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    const moments = [
      WAITING_DELAY_MS,
      STILL_WORKING_AFTER_MS[kind],
      limitMs,
      ...extra.split(",").filter(Boolean).map(Number),
    ];
    const timers = moments.map((moment) =>
      setTimeout(() => setElapsed(Math.max(moment, Date.now() - startedAt)), moment),
    );
    return () => {
      timers.forEach(clearTimeout);
      setElapsed(0);
    };
  }, [active, kind, limitMs, extra]);

  const shown = active ? elapsed : 0;
  return {
    ...waitingView(shown, kind, options.steps),
    elapsedMs: shown,
    overdue: active && shown >= limitMs,
  };
}

/** What a wait that outran its limit is refused with. */
export class WaitOverdueError extends Error {
  constructor() {
    super("The wait ran past its limit.");
    this.name = "WaitOverdueError";
  }
}

/**
 * `work`, or a `WaitOverdueError` once `limitMs` has passed. For reads and
 * for preparing a review only: the work itself is not stopped, so nothing
 * that signs or sends may be given up on this way.
 */
export function withinLimit<T>(work: Promise<T>, limitMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new WaitOverdueError()), limitMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
