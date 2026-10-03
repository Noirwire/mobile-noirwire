import { cashOf } from "@noirwire/shared/wallet";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EarnPosition } from "@noirwire/shared/infrastructure";
import type { EarnPortfolio, EarnRateRead, EarnTotal } from "@noirwire/shared/presentation";
import { useMoney } from "../network/money";
import { useWalletSnapshot } from "../network/useWalletSnapshot";
import { useServices } from "../services";

/**
 * Each portfolio's position at the lending venue, one request per portfolio
 * so no request names two of them. Undefined while one is read, null when it
 * could not be. Read again whenever `version` changes.
 */
function useEarnPositions(version: number, onSettled?: () => void) {
  const money = useMoney();
  const wallet = useWalletSnapshot();
  const available = money.earnChain.available();
  const [positions, setPositions] = useState<Record<string, EarnPosition | null>>({});

  const addresses = useMemo(
    () => (wallet?.portfolios ?? []).map((portfolio) => [portfolio.id, portfolio.address] as const),
    [wallet],
  );
  const key = addresses.map(([id]) => id).join(",");

  useEffect(() => {
    if (!available) return;
    let current = true;
    const reads = addresses.map(([id, address]) =>
      money.earnVenue
        .position(address)
        .then((position): EarnPosition | null => position)
        .catch(() => null)
        .then((position) => current && setPositions((all) => ({ ...all, [id]: position }))),
    );
    void Promise.all(reads).finally(() => current && onSettled?.());
    return () => {
      current = false;
    };
    // Read again when the set of portfolios changes, not on every balance update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [money, available, key, version]);

  return { money, wallet, available, positions };
}

/**
 * What every portfolio has in Earn together, for Home, which shows it only
 * when there is something in Earn: undefined where Earn is not offered,
 * while it is still read and when nothing is lent, null when a position
 * could not be read.
 */
export function useEarnTotal(): EarnTotal {
  // Every money move is logged, so the positions are read again after one.
  const moves = useWalletSnapshot()?.activity.length ?? 0;
  const { wallet, available, positions } = useEarnPositions(moves);
  if (!available || !wallet) return undefined;
  const read = wallet.portfolios.map((portfolio) => positions[portfolio.id]);
  if (read.some((position) => position === undefined)) return undefined;
  if (read.some((position) => position === null)) return null;
  const total = read.reduce((sum, position) => sum + (position?.deposited ?? 0), 0);
  return total > 0 ? total : undefined;
}

/**
 * What the Earn screen reads: the venue's rate and each portfolio's position.
 * Read on open and again on pull to refresh or after an action.
 */
export function useEarnScreen() {
  const online = useServices().useOnline();
  const [rate, setRate] = useState<EarnRateRead | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { money, wallet, available, positions } = useEarnPositions(version, () =>
    setRefreshing(false),
  );

  useEffect(() => {
    if (!available) return;
    let current = true;
    money.earnVenue
      .rate()
      .then((next) => current && setRate(next))
      .catch(() => current && setRate(null));
    return () => {
      current = false;
    };
  }, [money, available, version]);

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
