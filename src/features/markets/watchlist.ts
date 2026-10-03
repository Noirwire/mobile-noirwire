import { getPlatform } from "@noirwire/shared/platform";
import { updateWallet } from "@noirwire/shared/wallet";

/** Adds a tracker to the watchlist, or takes it off. Kept in the wallet record, on this phone only. */
export function toggleWatch(symbol: string) {
  getPlatform().track("watchlist_toggled");
  void updateWallet((current) => ({
    ...current,
    watchlist: current.watchlist.includes(symbol)
      ? current.watchlist.filter((entry) => entry !== symbol)
      : [...current.watchlist, symbol],
  }));
}
