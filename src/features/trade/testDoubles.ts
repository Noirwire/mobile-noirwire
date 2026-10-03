import { configureHttp } from "@noirwire/shared/infrastructure";

/**
 * The relay the markets, trade and pie screens read prices from, as a stubbed
 * fetch with fixed prices and history.
 */

export const FIXTURE_PRICES: Record<string, { usd: number; change24h: number }> = {
  NVDAx: { usd: 235.91, change24h: 2.21 },
  SPYx: { usd: 769.26, change24h: 0.51 },
  SPCXx: { usd: 157.09, change24h: 4.2 },
  QQQx: { usd: 748.58, change24h: -0.86 },
  TSLAx: { usd: 412.1, change24h: -1.4 },
  AAPLx: { usd: 255.2, change24h: 0 },
};

export const FIXTURE_HISTORY = [230.7, 231.2, 229.9, 233.4, 235.89];

type Relay = {
  prices?: Record<string, { usd: number; change24h: number }> | null;
  history?: number[] | null;
};

let clockOffset = 0;

/**
 * Points the shared clients at a stubbed relay. Each call moves the clock on
 * by ten minutes, so the shared price poll treats every test as a fresh start
 * and nothing one test read counts as live in the next.
 */
export function installFakeRelay(relay: Relay = {}) {
  const prices = relay.prices === undefined ? FIXTURE_PRICES : relay.prices;
  const history = relay.history === undefined ? FIXTURE_HISTORY : relay.history;
  clockOffset += 10 * 60 * 1000;
  const realNow = Date.now.bind(Date);
  const offset = clockOffset;
  jest.spyOn(Date, "now").mockImplementation(() => realNow() + offset);
  configureHttp({ baseUrl: "https://relay.test", headers: () => ({}) });
  const fetchMock = jest.fn(async (url: string) => {
    const body = url.endsWith("/api/prices")
      ? { prices }
      : url.includes("/api/history/")
        ? { points: history }
        : null;
    return {
      ok: body !== null,
      headers: { get: () => "0" },
      json: async () => body,
    };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
