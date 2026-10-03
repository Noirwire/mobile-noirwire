import { PublicKey } from "@solana/web3.js";
import {
  assetHandle,
  getCashBalances,
  getPortfolioBalances,
  shuffled,
} from "@noirwire/shared/infrastructure";
import { errorsCopy } from "@noirwire/shared/copy";
import { getPlatform } from "@noirwire/shared/platform";
import {
  catalog,
  getSnapshot,
  isUnlocked,
  serialised,
  updateWallet,
} from "@noirwire/shared/wallet";
import { balanceReads, type BalanceReads } from "./balanceReads";

let reads: BalanceReads | null = null;

/** The balance reads wired to the relay's Solana clients, made once on first use. */
export function deviceBalanceReads(): BalanceReads {
  reads ??= balanceReads({
    store: { snapshot: getSnapshot, update: updateWallet, isUnlocked, serialised },
    chain: {
      async balanceOf(owner, symbol) {
        const handle = assetHandle(symbol);
        if (!handle) throw new Error(errorsCopy.unknownAsset(symbol));
        return handle.getBalance(new PublicKey(owner));
      },
      portfolioBalances: (owner) => getPortfolioBalances(new PublicKey(owner)),
      cashBalances: (owner) => getCashBalances(new PublicKey(owner)),
    },
    prices: catalog,
    track: (name, data) => getPlatform().track(name, data as never),
    shuffle: shuffled,
  });
  return reads;
}
