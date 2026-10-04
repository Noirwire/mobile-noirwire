import { mobileWaitingCopy } from "@noirwire/shared/copy";
import { Notice } from "@/ui";
import type { Waiting } from "@/ui";

/**
 * Under a progress list that has run past its limit: the action may still go
 * through, so nothing claims it failed. The sheet stops holding the person,
 * and the portfolio stays blocked for a repeat until the chain has settled it.
 */
export function ActionOverdue({ waiting }: { waiting: Waiting }) {
  if (!waiting.overdue) return null;
  return <Notice tone="warning">{mobileWaitingCopy.overdue.action}</Notice>;
}
