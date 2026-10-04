import { Notice } from "@/ui";
import type { Waiting } from "@/ui";
import { phoneCopy } from "../phoneCopy";

/**
 * Under a progress list that has run past its limit: the action may still go
 * through, so nothing claims it failed. The sheet stops holding the person,
 * and the portfolio stays blocked for a repeat until the chain has settled it.
 */
export function ActionOverdue({ waiting }: { waiting: Waiting }) {
  if (!waiting.overdue) return null;
  return <Notice tone="warning">{phoneCopy.overdue.action}</Notice>;
}
