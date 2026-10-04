import { NEVER_READ, recordRead, type ReadFreshness } from "@noirwire/shared/domain";
import { isUnlocked, subscribe as subscribeWallet } from "@noirwire/shared/wallet";
import { useSyncExternalStore } from "react";

let freshness: ReadFreshness = NEVER_READ;
const listeners = new Set<() => void>();

function set(next: ReadFreshness) {
  if (next === freshness) return;
  freshness = next;
  listeners.forEach((listener) => listener());
}

let watchingLock = false;

/** What a locked wallet stored is not a read: the next unlock starts unread. */
function forgetOnLock() {
  if (watchingLock) return;
  watchingLock = true;
  subscribeWallet(() => {
    if (!isUnlocked()) set(NEVER_READ);
  });
}

/** How current the read of every balance in the unlocked wallet is. */
export function balanceFreshness(): ReadFreshness {
  return freshness;
}

/** Records one more read of every balance: whether it came back whole. */
export function recordBalanceRead(ok: boolean) {
  forgetOnLock();
  set(recordRead(freshness, ok, Date.now()));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The one balance freshness every money screen is told, kept by Home's refresh. */
export function useBalanceFreshness(): ReadFreshness {
  return useSyncExternalStore(subscribe, balanceFreshness);
}
