import { inProcessLocks } from "@noirwire/shared/platform";
import { fileNameFor, fileVault } from "./fileVault";
import type { VaultFiles } from "./vaultFiles.types";

type Operation = "prepare" | "read" | "write" | "rename" | "remove";

/** Files in memory, with a switch to make one operation throw, as a full or broken disk would. */
function memoryFiles() {
  const files = new Map<string, string>();
  const failing = new Set<string>();
  const fail = (operation: Operation, name = "*") => {
    if (failing.has(operation) || failing.has(`${operation}:${name}`))
      throw new Error(`${operation} failed`);
  };
  const api: VaultFiles & {
    files: Map<string, string>;
    failOn(operation: Operation, name?: string): void;
    heal(): void;
  } = {
    files,
    failOn: (operation, name) => void failing.add(name ? `${operation}:${name}` : operation),
    heal: () => failing.clear(),
    prepare: () => fail("prepare"),
    exists: (name) => files.has(name),
    read(name) {
      fail("read", name);
      return files.get(name) ?? null;
    },
    write(name, content) {
      fail("write", name);
      files.set(name, content);
    },
    rename(from, to) {
      fail("rename", from);
      if (!files.has(from) || files.has(to)) throw new Error("rename refused");
      files.set(to, files.get(from)!);
      files.delete(from);
    },
    remove(name) {
      fail("remove", name);
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

  it("finishes a write that crashed after the old file was removed, never reading nothing", async () => {
    const files = memoryFiles();
    const vault = fileVault(files, inProcessLocks());
    await vault.update(KEY, write("old"));
    files.failOn("rename", `${NAME}.ready`);
    expect(await vault.update(KEY, write("new"))).toEqual({ persisted: false, reason: "failed" });
    expect(files.files.has(NAME)).toBe(false);
    files.heal();
    expect(await vault.read(KEY)).toEqual({ ok: true, value: "new" });
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
