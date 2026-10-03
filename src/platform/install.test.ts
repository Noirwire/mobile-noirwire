import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { processLocks } from "@noirwire/shared/application";
import { installMoney, money } from "@noirwire/shared/wallet";
import { installMobilePlatform, installedPlatform } from "./install";

jest.mock("@noirwire/shared/wallet", () => {
  const actual = jest.requireActual("@noirwire/shared/wallet");
  return { ...actual, installMoney: jest.fn(actual.installMoney) };
});

jest.mock("@noirwire/shared/platform", () => {
  const actual = jest.requireActual("@noirwire/shared/platform");
  return { ...actual, assertRuntime: jest.fn(actual.assertRuntime) };
});

jest.mock("./vaultFiles", () => {
  const files = new Map<string, string>();
  return {
    deviceVaultFiles: () => ({
      prepare: () => undefined,
      exists: (name: string) => files.has(name),
      read: (name: string) => files.get(name) ?? null,
      write: (name: string, content: string) => void files.set(name, content),
      rename(from: string, to: string) {
        files.set(to, files.get(from)!);
        files.delete(from);
      },
      remove: (name: string) => void files.delete(name),
    }),
  };
});

jest.mock("expo-constants", () => ({ expoConfig: { version: "1.2.3" } }));
jest.mock("expo-local-authentication", () => ({}));
jest.mock("expo-secure-store", () => ({}));

const SOURCE = join(__dirname, "..", "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("installMobilePlatform", () => {
  beforeAll(() => {
    process.env.EXPO_PUBLIC_RELAY_URL = "https://relay.test";
    process.env.EXPO_PUBLIC_SOLANA_NETWORK = "devnet";
  });

  it("wires money exactly once, over the process-wide locks, however often it is asked", async () => {
    const first = await installMobilePlatform();
    const second = await installMobilePlatform();
    expect(installMoney).toHaveBeenCalledTimes(1);
    expect(installMoney).toHaveBeenCalledWith(processLocks());
    expect(second).toBe(first);
    expect(first.money).toBe(money());
    expect(installedPlatform().money).toBe(first.money);
  });

  it("is the only place in the app that wires money, a pending-action store or a signing guard", () => {
    const wiring = /\b(installMoney|createPendingActions|guardSigningWith|recordSignedWith)\s*\(/;
    const offenders = [join(SOURCE, "src"), join(SOURCE, "app")]
      .flatMap(sourceFiles)
      .filter((path) => wiring.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(SOURCE.length + 1));
    expect(offenders.sort()).toEqual([
      "src/features/network/testMoney.tsx",
      "src/platform/install.ts",
    ]);
  });
});

describe("installMobilePlatform under concurrency and failure", () => {
  // Each case resets the module registry so it starts from a clean,
  // never-installed copy of `./install` (and of the shared package's own
  // money singleton, which throws if wired twice) rather than reusing the
  // instance the tests above already installed onto.

  it("shares one in-flight installation across concurrent callers", async () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- needs the post-reset registry, not the static import above
    const wallet: typeof import("@noirwire/shared/wallet") = require("@noirwire/shared/wallet");
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- same: a fresh, never-installed copy
    const fresh: typeof import("./install") = require("./install");

    const [first, second] = await Promise.all([
      fresh.installMobilePlatform(),
      fresh.installMobilePlatform(),
    ]);

    expect(wallet.installMoney).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("lets a failed installation be retried", async () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- needs the post-reset registry, not the static import above
    const platform: typeof import("@noirwire/shared/platform") = require("@noirwire/shared/platform");
    (platform.assertRuntime as jest.Mock).mockImplementationOnce(() => {
      throw new Error("boot check failed");
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- same: a fresh, never-installed copy
    const fresh: typeof import("./install") = require("./install");

    await expect(fresh.installMobilePlatform()).rejects.toThrow("boot check failed");

    const result = await fresh.installMobilePlatform();
    expect(result.money).toBeDefined();
  });
});
