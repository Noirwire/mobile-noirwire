/**
 * @jest-environment node
 */
import {
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inProcessLocks } from "@noirwire/shared/platform";
import { installTestPlatform, memoryVault } from "@noirwire/shared/testing";
import {
  STORAGE_KEY,
  createWallet,
  getPhrase,
  getSnapshot,
  isEnvelope,
  lock,
  storeNewWallet,
  unlock,
} from "@noirwire/shared/wallet";
import { fileVault } from "./fileVault";
import type { VaultFiles } from "./vaultFiles.types";
import { withRealKeyDerivation } from "../../jest/keyDerivation";

const PASSWORD = "harbor-velvet-orbit-canyon-meadow";

/** The vault's files on a real disk, in a throwaway directory. */
function diskFiles(directory: string): VaultFiles {
  const path = (name: string) => join(directory, name);
  return {
    prepare: () => void mkdirSync(directory, { recursive: true }),
    exists: (name) => existsSync(path(name)),
    read: (name) => (existsSync(path(name)) ? readFileSync(path(name), "utf8") : null),
    write: (name, content) => writeFileSync(path(name), content),
    rename: (from, to) => {
      if (existsSync(path(to))) throw new Error("exists");
      renameSync(path(from), path(to));
    },
    remove: (name) => rmSync(path(name), { force: true }),
  };
}

describe("a record sealed by the shared keystore under Node", () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "noirwire-vault-"));
  });
  afterEach(() => {
    lock();
    rmSync(directory, { recursive: true, force: true });
  });

  it("opens through the mobile file vault, byte for byte the same envelope", () =>
    withRealKeyDerivation(async () => {
      const sealedBy = memoryVault();
      installTestPlatform({ vault: sealedBy });
      const draft = createWallet();
      await storeNewWallet(draft.wallet, draft.phrase, PASSWORD);
      const envelope = sealedBy.peek(STORAGE_KEY)!;
      expect(isEnvelope(JSON.parse(envelope))).toBe(true);
      lock();

      const locks = inProcessLocks();
      const vault = fileVault(diskFiles(directory), locks);
      expect((await vault.update(STORAGE_KEY, () => ({ write: envelope }))).persisted).toBe(true);
      installTestPlatform({ vault, locks });

      expect(await vault.read(STORAGE_KEY)).toEqual({ ok: true, value: envelope });
      expect(await unlock("not the password at all")).not.toBeNull();
      expect(await unlock(PASSWORD)).toBeNull();
      expect(getPhrase()).toEqual(draft.phrase);
      expect(getSnapshot()?.funding.address).toBe(draft.wallet.funding.address);
    }));
});
