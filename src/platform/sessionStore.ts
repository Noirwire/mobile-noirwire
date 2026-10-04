import type { SessionStore, VaultRepository } from "@noirwire/shared/platform";

const SESSION_KEY = "noirwire.mobile.session";

/**
 * The app's anonymous session with the API, kept where the preferences are:
 * as plain text under its own key in the app's file storage. It is read
 * before any wallet exists or is unlocked, so it is never part of the
 * encrypted wallet record and never behind the biometric keystore. The
 * shared package removes it on a wallet reset. A failed read or write throws,
 * which the shared package takes as nothing stored.
 */
export function plainSessionStore(storage: VaultRepository): SessionStore {
  const write = async (value: string | null) => {
    const outcome = await storage.update(SESSION_KEY, () => ({ write: value }));
    if (!outcome.persisted) throw new Error("The session could not be stored.");
  };
  return {
    async get() {
      const read = await storage.read(SESSION_KEY);
      if (!read.ok) throw new Error("The session could not be read.");
      return read.value;
    },
    set: (value) => write(value),
    remove: () => write(null),
  };
}
