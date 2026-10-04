import { fakeApi } from "@noirwire/shared/testing";

/**
 * The API the markets, trade and pie screens read prices from, answered by
 * the shared fake with fixed prices and history, in the API's own shapes.
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

type Answers = {
  prices?: Record<string, { usd: number; change24h: number }> | null;
  history?: number[] | null;
};

const refusal = (status: number, code: string) =>
  new Response(JSON.stringify({ code, error: "A plain sentence for a person." }), { status });

let clockOffset = 0;

/**
 * Answers the shared clients' price and history requests. Null stands for
 * the API's refusal: prices it could not supply, a tracker with no history.
 * Each call moves the clock on by ten minutes, so the shared price poll
 * treats every test as a fresh start and nothing one test read counts as
 * live in the next.
 */
export function installFakePrices(answers: Answers = {}) {
  const prices = answers.prices === undefined ? FIXTURE_PRICES : answers.prices;
  const history = answers.history === undefined ? FIXTURE_HISTORY : answers.history;
  clockOffset += 10 * 60 * 1000;
  const realNow = Date.now.bind(Date);
  const offset = clockOffset;
  jest.spyOn(Date, "now").mockImplementation(() => realNow() + offset);
  return fakeApi({
    "GET /v1/prices": () => (prices ? { prices } : refusal(502, "upstream_refused")),
    "GET /v1/history/*": () => (history ? { points: history } : refusal(404, "not_found")),
  });
}
