import type { VaultFiles } from "./vaultFiles.types";

const PREFIX = "noirwire.vault/";

/**
 * The browser build exists for browser tests only, and a browser has no file
 * system, so the same named files live in its local storage. Nothing here
 * ships in the phone app.
 */
export function deviceVaultFiles(): VaultFiles {
  const storage = () => globalThis.localStorage;
  return {
    prepare() {
      storage();
    },
    exists: (name) => storage().getItem(PREFIX + name) !== null,
    read: (name) => storage().getItem(PREFIX + name),
    write: (name, content) => storage().setItem(PREFIX + name, content),
    rename(from, to) {
      const value = storage().getItem(PREFIX + from);
      if (value === null) throw new Error("Nothing to rename.");
      storage().setItem(PREFIX + to, value);
      storage().removeItem(PREFIX + from);
    },
    remove: (name) => storage().removeItem(PREFIX + name),
  };
}
