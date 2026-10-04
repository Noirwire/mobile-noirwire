/**
 * How many waits are currently holding the top loader on. Several screens or
 * sheets can each be waiting for something of their own at once; the bar
 * stays on for as long as any of them are, and off once none are. A plain
 * module-level count, read through `useSyncExternalStore` by every mounted
 * `TopLoader`, so the root bar and a sheet's own bar always agree.
 */
let count = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const topLoaderStore = {
  add() {
    count += 1;
    emit();
  },
  remove() {
    count = Math.max(0, count - 1);
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return count;
  },
  /** Test-only: starts the next test from a clean count. */
  reset() {
    count = 0;
    emit();
  },
};
