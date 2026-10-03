import type { Locks, VaultChange, VaultRepository } from "@noirwire/shared/platform";
import type { VaultFiles } from "./vaultFiles.types";

/**
 * Each key is one file. A write never touches the live file until the new
 * contents are complete on disk:
 *
 *   1. the value is written to `<name>.next`;
 *   2. `.next` is renamed to `<name>.ready`, which therefore only ever holds a
 *      complete value;
 *   3. the live file is removed and `.ready` is renamed over it.
 *
 * Renaming onto an existing file is not atomic on every platform, hence the
 * removal in step 3. A crash between its two halves leaves `.ready` and no
 * live file; a crash inside step 1 leaves a partial `.next`. Before every
 * read and write, `recover` finishes the first case and discards the second,
 * so a reader sees either the old value or the new one, never a mix and
 * never nothing.
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

function replace(files: VaultFiles, name: string, value: string | null) {
  if (value === null) {
    files.remove(name + NEXT);
    files.remove(name + READY);
    files.remove(name);
    return;
  }
  files.write(name + NEXT, value);
  files.rename(name + NEXT, name + READY);
  files.remove(name);
  files.rename(name + READY, name);
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
          replace(files, name, decision.write);
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
