/**
 * The web app's number rules, mirrored. A change to either side has to be
 * made on both; format.test.ts carries the web's own cases.
 */

export function usd(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function shares(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/** A real SPL token amount in its own unit (not a dollar sign): two decimals, matching its real-money-like role. */
export function tokenAmount(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** USDC reads like money, with two decimals. Everything else is held in shares, with four. */
export function symbolAmount(symbol: string, amount: number) {
  return symbol === "USDC" ? `${tokenAmount(amount)} ${symbol}` : `${shares(amount)} ${symbol}`;
}

export function changeTone(value: number): "safe" | "danger" {
  return value >= 0 ? "safe" : "danger";
}

/** A signed percentage alone, or a signed dollar gain with its percentage. */
export function deltaText(percent: number, gain?: number) {
  const sign = (gain ?? percent) >= 0 ? "+" : "-";
  return gain === undefined
    ? `${sign}${Math.abs(percent).toFixed(2)}%`
    : `${sign}${usd(Math.abs(gain))} (${Math.abs(percent).toFixed(1)}%)`;
}
