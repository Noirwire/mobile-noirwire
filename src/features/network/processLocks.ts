import type { PendingActionsDeps } from "@noirwire/shared/application";

/**
 * The locks that say a reservation's owner is alive, for a phone, which runs
 * one process. A reservation this run is holding is alive for as long as it
 * holds it; any other was left by an earlier run of the app, which is gone,
 * and if nothing was signed under it, it can be released.
 */
export function processLocks(): PendingActionsDeps["locks"] {
  const held = new Set<string>();
  return {
    async hold(id) {
      held.add(id);
      return () => void held.delete(id);
    },
    ownerGone: async (id) => !held.has(id),
  };
}
