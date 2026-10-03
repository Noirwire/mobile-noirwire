import { inProcessLocks } from "@noirwire/shared/platform";
import { fileNameFor, fileVault } from "./fileVault";
import type { VaultFiles } from "./vaultFiles.types";

type Operation = "prepare" | "exists" | "read" | "write" | "rename" | "remove";

/**
 * Files in memory, with switches to make one operation throw (as a full or
 * broken disk would), to let a rename take effect and still throw, and to
 * stop the process dead after a number of changes to the disk.
 */
function memoryFiles(files = new Map<string, string>()) {
  const failing = new Set<string>();
  const torn = new Set<string>();
  let changesLeft = Infinity;
  const fail = (operation: Operation, name = "*") => {
    if (changesLeft < 0) throw new Error("the process is gone");
    if (failing.has(operation) || failing.has(`${operation}:${name}`))
      throw new Error(`${operation} failed`);
  };
  const change = () => {
    if (changesLeft-- <= 0) throw new Error("the process is gone");
  };
  const api: VaultFiles & {
    files: Map<string, string>;
    failOn(operation: Operation, name?: string): void;
    tearRename(from: string): void;
    crashAfter(changes: number): void;
    heal(): void;
  } = {
    files,
    failOn: (operation, name) => void failing.add(name ? `${operation}:${name}` : operation),
    tearRename: (from) => void torn.add(from),
    crashAfter: (changes) => void (changesLeft = changes),
    heal: () => {
      failing.clear();
      torn.clear();
    },
    prepare: () => fail("prepare"),
    exists(name) {
      fail("exists", name);
      return files.has(name);
    },
    read(name) {
      fail("read", name);
      return files.get(name) ?? null;
    },
    write(name, content) {
      fail("write", name);
      change();
      files.set(name, content);
    },
    rename(from, to) {
      fail("rename", from);
      change();
      if (!files.has(from) || files.has(to)) throw new Error("rename refused");
      files.set(to, files.get(from)!);
      files.delete(from);
      if (torn.has(from)) throw new Error("rename reported failure after renaming");
    },
    remove(name) {
      fail("remove", name);
      change();
      files.delete(name);
    },
  };
  return api;
}

const KEY = "noirwire.wallet.v9";
const NAME = fileNameFor(KEY);
const write = (value: string | null) => () => ({ write: value });

describe("fileVault", () => {
  it("reads nothing from an empty vault, and what was written after a write", async () => {
    const vault = fileVault(memoryFiles(), inProcessLocks());
    expect(await vault.read(KEY)).toEqual({ ok: true, value: null });
    expect(await vault.update(KEY, write("sealed"))).toEqual({ persisted: true, value: "sealed" });
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "sealed" });
  });

  it("keeps one file per key, named so a key cannot leave the directory", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update("../../escape/key", write("x"));
    expect([...files.files.keys()]).toEqual([fileNameFor("../../escape/key")]);
    expect(fileNameFor("../../escape/key")).not.toMatch(/\/|\.\./);
  });

  it("hands the change the stored value and reports a kept value without writing", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("first"));
    const seen: (string | null)[] = [];
    const outcome = await vault.update(KEY, (current) => {
      seen.push(current);
      return { keep: true };
    });
    expect(seen).toEqual(["first"]);
    expect(outcome).toEqual({ persisted: false, reason: "kept", value: "first" });
  });

  it("removes the value, and every temporary file with it, on a write of null", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("sealed"));
    await vault.update(KEY, write(null));
    expect(files.files.size).toBe(0);
    expect(await vault.read(KEY)).toEqual({ ok: true, value: null });
  });

  it("serialises updates of one key, so none is lost between a read and a write", async () => {
    const vault = fileVault(memoryFiles(), inProcessLocks());
    const increment = () =>
      vault.update(KEY, (current) => ({ write: String(Number(current ?? "0") + 1) }));
    await Promise.all(Array.from({ length: 20 }, increment));
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "20" });
  });

  it("reports a failed write and leaves the old value in place", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.failOn("write");
    expect(await vault.update(KEY, write("new"))).toEqual({ persisted: false, reason: "failed" });
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "old" });
  });

  it("discards a half-written next file left by a crash and keeps the old value", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.files.set(`${NAME}.next`, '{"partial');
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "old" });
    expect(files.files.has(`${NAME}.next`)).toBe(false);
  });

  it("reports a write whose last rename failed after the old file was removed as the new value", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    const heard: string[] = [];
    vault.subscribe((key) => heard.push(key));
    await vault.update(KEY, write("old"));
    files.failOn("rename", `${NAME}.ready`);
    expect(await vault.update(KEY, write("new"))).toEqual({ persisted: true, value: "new" });
    expect(files.files.has(NAME)).toBe(false);
    expect(heard).toEqual([KEY, KEY]);
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "new" });
    expect(await fileVault(memoryFiles(files.files), inProcessLocks()).read(KEY)).toEqual({
      ok: true,
      value: "new",
    });
  });

  it("reports the new value when the old file cannot be removed after the commit point", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.failOn("remove", NAME);
    expect(await vault.update(KEY, write("new"))).toEqual({ persisted: true, value: "new" });
    expect(await vault.read(KEY)).toEqual({ ok: false });
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "new" });
  });

  it("reports a failed staging rename and leaves no staged file a later read could promote", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.failOn("rename", `${NAME}.next`);
    expect(await vault.update(KEY, write("new"))).toEqual({ persisted: false, reason: "failed" });
    expect([...files.files.keys()]).toEqual([NAME]);
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "old" });
  });

  it("rolls back a staging rename that took effect but reported failure", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.tearRename(`${NAME}.next`);
    expect(await vault.update(KEY, write("new"))).toEqual({ persisted: false, reason: "failed" });
    expect([...files.files.keys()]).toEqual([NAME]);
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "old" });
  });

  it("reports the new value when a torn staging rename cannot be rolled back", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.tearRename(`${NAME}.next`);
    files.failOn("remove", `${NAME}.ready`);
    expect(await vault.update(KEY, write("new"))).toEqual({ persisted: true, value: "new" });
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "new" });
  });

  it("reports a failed removal as failed and keeps the old value", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.failOn("remove", NAME);
    expect(await vault.update(KEY, write(null))).toEqual({ persisted: false, reason: "failed" });
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "old" });
  });

  it("reports what a fresh vault reads, whichever step a crash stops the write at", async () => {
    const steps = ["recover", "write next", "stage ready", "remove live", "promote ready", "done"];
    const outcomes = await Promise.all(
      steps.map(async (_, changes) => {
        const files = memoryFiles();
        await fileVault(files, inProcessLocks()).update(KEY, write("old"));
        files.crashAfter(changes);
        const reported = await fileVault(files, inProcessLocks()).update(KEY, write("new"));
        const reread = await fileVault(memoryFiles(files.files), inProcessLocks()).read(KEY);
        return { reported: reported.persisted, reread };
      }),
    );
    expect(outcomes).toEqual([
      { reported: false, reread: { ok: true, value: "old" } },
      { reported: false, reread: { ok: true, value: "old" } },
      { reported: false, reread: { ok: true, value: "old" } },
      { reported: true, reread: { ok: true, value: "new" } },
      { reported: true, reread: { ok: true, value: "new" } },
      { reported: true, reread: { ok: true, value: "new" } },
    ]);
  });

  it("ends a crash during recovery in the new value, never nothing", async () => {
    const files = memoryFiles();
    files.files.set(NAME, "old");
    files.files.set(`${NAME}.ready`, "new");
    files.crashAfter(1);
    expect(await fileVault(files, inProcessLocks()).read(KEY)).toEqual({ ok: false });
    expect([...files.files.keys()]).toEqual([`${NAME}.ready`]);
    const fresh = memoryFiles(files.files);
    expect(await fileVault(fresh, inProcessLocks()).read(KEY)).toEqual({ ok: true, value: "new" });
    expect([...fresh.files.keys()]).toEqual([NAME]);
  });

  it("reads back the same value after recovery as the update reported", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.failOn("rename", `${NAME}.ready`);
    const reported = await vault.update(KEY, write("new"));
    files.heal();
    const first = await vault.read(KEY);
    const second = await fileVault(memoryFiles(files.files), inProcessLocks()).read(KEY);
    expect(reported).toEqual({ persisted: true, value: "new" });
    expect(first).toEqual({ ok: true, value: "new" });
    expect(second).toEqual(first);
  });

  it("reports an unreadable store as a failed read rather than throwing", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    files.failOn("prepare");
    expect(await vault.read(KEY)).toEqual({ ok: false });
    expect(await vault.update(KEY, write("x"))).toEqual({ persisted: false, reason: "failed" });
  });

  it("tells subscribers of persisted changes only, until they unsubscribe", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    const heard: string[] = [];
    const stop = vault.subscribe((key) => heard.push(key));
    await vault.update(KEY, write("a"));
    await vault.update(KEY, () => ({ keep: true }));
    files.failOn("write");
    await vault.update(KEY, write("b"));
    files.heal();
    stop();
    await vault.update(KEY, write("c"));
    expect(heard).toEqual([KEY]);
  });
});
