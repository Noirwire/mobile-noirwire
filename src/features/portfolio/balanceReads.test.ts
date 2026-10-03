import { getSnapshot, isUnlocked, serialised, updateWallet } from "@noirwire/shared/wallet";
import { forgetWallet, installTestPlatform } from "../testServices";
import { balanceReads } from "./balanceReads";
import { unlockedWallet } from "./testWallet";

afterEach(() => forgetWallet());

function reads(chain: { fail?: boolean; seen: string[] }) {
  return balanceReads({
    store: { snapshot: getSnapshot, update: updateWallet, isUnlocked, serialised },
    chain: {
      balanceOf: async () => 0,
      async portfolioBalances(address) {
        chain.seen.push(address);
        if (chain.fail) throw new Error("unreachable");
        return { cash: { USDC: 12.5, SOL: 0 }, trackers: {} };
      },
      async cashBalances(address) {
        chain.seen.push(address);
        return { SOL: 0, USDC: 3 };
      },
    },
    prices: { price: () => 0, isPosition: () => false },
    track: () => undefined,
    shuffle: (items) => items,
  });
}

describe("balanceReads", () => {
  it("reads the funding wallet, then each active portfolio, one address per request", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet((w) => ({
      ...w,
      portfolios: [
        ...w.portfolios,
        { ...w.portfolios[0], id: "old", address: "archived-address", archivedAt: 1 },
      ],
    }));
    const chain = { seen: [] as string[] };
    expect(await reads(chain).everything()).toBe(true);
    expect(chain.seen).toEqual([wallet.funding.address, wallet.portfolios[0].address]);
    expect(getSnapshot()!.funding.tokens.USDC).toBe(3);
    expect(getSnapshot()!.portfolios[0].holdings.find((h) => h.symbol === "USDC")?.amount).toBe(
      12.5,
    );
  });

  it("answers false when a read failed, keeping what was stored", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet();
    const chain = { seen: [] as string[], fail: true };
    const balances = reads(chain);
    expect(await balances.everything()).toBe(false);
    expect(await balances.portfolio(wallet.portfolios[0].id)).toBe(false);
    chain.fail = false;
    expect(await balances.portfolio(wallet.portfolios[0].id)).toBe(true);
  });
});
