import type { Locks, VaultChange, VaultRepository } from "@noirwire/shared/platform";
import type { VaultFiles } from "./vaultFiles.types";

/**
 * Each key is one file. A write never touches the live file until the new
 * contents are complete on disk:
 *
 *   1. the value is written to `<name>.next`;
 *   2. `.next` is renamed to `<name>.ready`, which therefore only ever holds a
 *      complete value. This rename is the commit point: from here on the new
 *      value is the stored one, because nothing ever discards a `.ready`
 *      except a write that has not yet been reported;
 *   3. the live file is removed and `.ready` is renamed over it.
 *
 * Renaming onto an existing file is not atomic on every platform, hence the
 * removal in step 3. Before every read and write, `recover` promotes a
 * leftover `.ready` (a crash anywhere in step 3) and discards a leftover
 * `.next` (a crash in step 1 or 2), so a reader sees either the old value or
 * the new one, never a mix and never nothing.
 *
 * When a step of an update throws, the update does not guess: it runs the
 * same recovery and reports what is now stored, so a reported failure always
 * means the old value stays and a reported success the new one.
 */
const NEXT = ".next";
const READY = ".ready";

/** File names stay inside the vault's directory whatever the key holds. */
export function fileNameFor(key: string): string {
  return `${encodeURIComponent(key).replace(/\./g, "%2E")}.value`;
}

function recover(files: VaultFiles, name: string) {
  if (files.exists(name + READY)) {
    files.remove(name);
    files.rename(name + READY, name);
  }
  files.remove(name + NEXT);
}

/** The value a read will return once recovery has run, whether or not it has yet. */
function committedValue(files: VaultFiles, name: string) {
  return files.exists(name + READY) ? files.read(name + READY) : files.read(name);
}

type Progress = { committed: boolean };

function replace(files: VaultFiles, name: string, value: string | null, progress: Progress) {
  if (value === null) {
    files.remove(name + NEXT);
    files.remove(name + READY);
    files.remove(name);
    return;
  }
  files.write(name + NEXT, value);
  files.rename(name + NEXT, name + READY);
  progress.committed = true;
  files.remove(name);
  files.rename(name + READY, name);
}

const UNOBSERVABLE = Symbol("unobservable");

function attempt<T>(task: () => T): T | typeof UNOBSERVABLE {
  try {
    return task();
  } catch {
    return UNOBSERVABLE;
  }
}

/** Throws unless the staged files are gone, so the old value is all that is left. */
function abandon(files: VaultFiles, name: string) {
  files.remove(name + READY);
  files.remove(name + NEXT);
  if (files.exists(name + READY)) throw new Error("A staged value could not be removed.");
}

/**
 * Settles an update whose `replace` threw, by the same recovery a read runs:
 * true when `requested` is now the stored value, false when `previous` still
 * is. Before the commit point the staged files are discarded first, so the
 * old value is the deterministic outcome; after it, the new one is. Throws
 * only when neither can be established.
 */
function settle(
  files: VaultFiles,
  name: string,
  previous: string | null,
  requested: string | null,
  progress: Progress,
): boolean {
  if (!progress.committed) attempt(() => abandon(files, name));
  attempt(() => recover(files, name));
  const stored = attempt(() => committedValue(files, name));
  if (stored === requested) return true;
  if (stored === previous) {
    abandon(files, name);
    return false;
  }
  if (stored === UNOBSERVABLE && progress.committed) return true;
  throw new Error("The stored value cannot be established.");
}

/**
 * The vault port over files. Reads and updates of one key run one at a time
 * under the platform lock for that key, so nothing in this process comes
 * between an update's read and its write; a phone app has no second tab or
 * process to coordinate with, so subscribers hear of this process's writes.
 * Every failure is reported as the port's `ok: false` or `failed`, never
 * thrown.
 */
export function fileVault(files: VaultFiles, locks: Locks): VaultRepository {
  const listeners = new Set<(key: string) => void>();
  const underLock = <T>(key: string, task: () => T) =>
    locks.withLock(`vault:${key}`, async () => {
      files.prepare();
      const name = fileNameFor(key);
      recover(files, name);
      return task();
    });

  return {
    async read(key) {
      try {
        return { ok: true, value: await underLock(key, () => files.read(fileNameFor(key))) };
      } catch {
        return { ok: false };
      }
    },

    async update(key, change: (current: string | null) => VaultChange) {
      let outcome;
      try {
        outcome = await underLock(key, () => {
          const name = fileNameFor(key);
          const current = files.read(name);
          const decision = change(current);
          if ("keep" in decision)
            return { persisted: false, reason: "kept", value: current } as const;
          const progress: Progress = { committed: false };
          try {
            replace(files, name, decision.write, progress);
          } catch {
            if (!settle(files, name, current, decision.write, progress))
              return { persisted: false, reason: "failed" } as const;
          }
          return { persisted: true, value: decision.write } as const;
        });
      } catch {
        return { persisted: false, reason: "failed" };
      }
      if (outcome.persisted) listeners.forEach((listener) => listener(key));
      return outcome;
    },

    subscribe(onChange) {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
  };
}
