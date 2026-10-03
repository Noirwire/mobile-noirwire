import type {
  ActionDeps,
  EarnChain,
  PendingActions,
  PrivateToken,
  SendChain,
  createBalanceRefresh,
} from "@noirwire/shared/application";
import type { EarnPosition, EarnRate } from "@noirwire/shared/infrastructure";
import type { Keypair } from "@solana/web3.js";
import { createContext, useContext, type ReactNode } from "react";
import type { Unsendable } from "../send/recipientCheck";
import { deviceMoney } from "./deviceMoney";

/** The lending venue as the Earn screens read it. */
export type EarnVenue = {
  name: string;
  rate(): Promise<EarnRate>;
  position(address: string): Promise<EarnPosition>;
  /** What the portfolio's own network cost would be, before the relayer is asked to pay it. */
  lamportsNeeded(position: EarnPosition): number;
};

/**
 * What the money screens reach the chain, the relayer, the venues and the
 * pending-action record through: the shared use cases' ports, wired once for
 * the device (`deviceMoney`) and replaced by fakes in tests. Nothing here
 * decides anything.
 */
export type Money = {
  deps: ActionDeps<Keypair>;
  refresh: ReturnType<typeof createBalanceRefresh>;
  privateToken(symbol: string): PrivateToken<Keypair> | undefined;
  sendChain: SendChain<Keypair>;
  earnChain: EarnChain<Keypair>;
  earnVenue: EarnVenue;
  /** Reads the recipient from the network: what it is when it cannot receive, or null for a wallet. */
  checkRecipient(address: string): Promise<Unsendable | null>;
  pending: PendingActions;
  /** The cash every cost is paid in. */
  cashSymbol: string;
};

const MoneyContext = createContext<Money | null>(null);

export function MoneyProvider({ money, children }: { money: Money; children: ReactNode }) {
  return <MoneyContext.Provider value={money}>{children}</MoneyContext.Provider>;
}

/** The provided money services, or the device's own when none is provided. */
export function useMoney(): Money {
  return useContext(MoneyContext) ?? deviceMoney();
}
