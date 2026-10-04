import { stockBySymbol, tokenBySymbol } from "@noirwire/shared/infrastructure";

/** How many decimals an asset has, so an amount typed with more is refused and told its smallest amount. */
export function assetDecimals(symbol: string): number | undefined {
  return tokenBySymbol(symbol)?.decimals ?? stockBySymbol(symbol)?.decimals;
}
