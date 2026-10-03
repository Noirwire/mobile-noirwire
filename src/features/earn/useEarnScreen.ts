import { cashOf } from "@noirwire/shared/wallet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "../services";
import { useMoney } from "../network/money";
import { useWalletSnapshot } from "../network/useWalletSnapshot";
import type { EarnPosition } from "@noirwire/shared/infrastructure";
import type { EarnPortfolio, EarnRate } from "./earnView";

/**
 * What the Earn screen reads: the venue's rate and each portfolio's position,
 * one request per portfolio so no request names two of them. Read on open and
 * again on pull to refresh or after an action.
 */
export function useEarnScreen() {
  const money = useMoney();
  const online = useServices().useOnline();
  const wallet = useWalletSnapshot();
  const available = money.earnChain.available();
  const [rate, setRate] = useState<EarnRate | null | undefined>(undefined);
  const [positions, setPositions] = useState<Record<string, EarnPosition | null>>({});
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const addresses = useMemo(
    () => (wallet?.portfolios ?? []).map((portfolio) => [portfolio.id, portfolio.address] as const),
    [wallet],
  );
  const key = addresses.map(([id]) => id).join(",");

  useEffect(() => {
    if (!available) return;
    let current = true;
    const reads = [
      money.earnVenue
        .rate()
        .then((next) => current && setRate(next))
        .catch(() => current && setRate(null)),
      ...addresses.map(([id, address]) =>
        money.earnVenue
          .position(address)
          .then((position): EarnPosition | null => position)
          .catch(() => null)
          .then((position) => current && setPositions((all) => ({ ...all, [id]: position }))),
      ),
    ];
    void Promise.all(reads).finally(() => current && setRefreshing(false));
    return () => {
      current = false;
    };
    // Read again when the set of portfolios changes, not on every balance update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [money, available, key, version]);

  const reload = useCallback(() => setVersion((count) => count + 1), []);

  const portfolios: EarnPortfolio[] = (wallet?.portfolios ?? []).map((portfolio) => ({
    id: portfolio.id,
    label: portfolio.label,
    archived: portfolio.archivedAt !== null,
    cash: cashOf(portfolio),
    position: available ? positions[portfolio.id] : null,
  }));

  return {
    available,
    online,
    venue: money.earnVenue.name,
    rate: available ? rate : null,
    portfolios,
    icons: Object.fromEntries((wallet?.portfolios ?? []).map((entry) => [entry.id, entry.icon])),
    /** The venue's full reading of a portfolio's position, for working out an action's cost. */
    positionOf: (id: string) => (available ? (positions[id] ?? null) : null),
    refreshing,
    refresh() {
      if (!online) return;
      setRefreshing(true);
      reload();
    },
    reload,
  };
}

export type EarnScreenState = ReturnType<typeof useEarnScreen>;
