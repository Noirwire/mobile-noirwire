import type { Money } from "@noirwire/shared/wallet";
import { createContext, useContext, type ReactNode } from "react";

export type { Money };

const MoneyContext = createContext<Money | null>(null);

/**
 * Hands every money screen the one money wiring `installMoney` made at boot:
 * one pending-action store and one signing guard for the whole app. A test
 * provides the same wiring with its chain clients replaced by stand-ins.
 */
export function MoneyProvider({ money, children }: { money: Money; children: ReactNode }) {
  return <MoneyContext.Provider value={money}>{children}</MoneyContext.Provider>;
}

export function useMoney(): Money {
  const money = useContext(MoneyContext);
  if (!money) throw new Error("useMoney() outside MoneyProvider.");
  return money;
}
