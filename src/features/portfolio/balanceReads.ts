import { createBalanceRefresh } from "@noirwire/shared/application";

type BalanceDeps = Parameters<typeof createBalanceRefresh>[0];
type BalanceChain = BalanceDeps["chain"];

/** What a screen asks for when it re-reads balances: true only when every read came back. */
export type BalanceReads = {
  /** The funding wallet, then each active portfolio, one address per request. */
  everything(): Promise<boolean>;
  /** One portfolio's balances. */
  portfolio(id: string): Promise<boolean>;
};

/**
 * The shared refresh use case, with a note of whether any read failed. The use
 * case keeps the last stored values when a read fails, which is right; a
 * screen still has to say the values could not be refreshed, so the chain it
 * is given reports each failure here before passing it on.
 */
export function balanceReads(deps: BalanceDeps): BalanceReads {
  let failed = false;
  function noted<A extends unknown[], R>(read: (...args: A) => Promise<R>) {
    return async (...args: A): Promise<R> => {
      try {
        return await read(...args);
      } catch (error) {
        failed = true;
        throw error;
      }
    };
  }
  const chain: BalanceChain = {
    balanceOf: noted(deps.chain.balanceOf),
    portfolioBalances: noted(deps.chain.portfolioBalances),
    cashBalances: noted(deps.chain.cashBalances),
  };
  const refresh = createBalanceRefresh({ ...deps, chain });

  return {
    async everything() {
      failed = false;
      await refresh.fundingBalances();
      await refresh.allPortfolios();
      return !failed;
    },
    async portfolio(id) {
      failed = false;
      const read = await refresh.portfolioBalances(id);
      return read !== undefined && !failed;
    },
  };
}
