import { expect, test as base, type Page } from "@playwright/test";
import { FixtureApi } from "./api";
import {
  FUNDING_USDC,
  PORTFOLIO_EARN_USDC,
  PORTFOLIO_USDC,
  seededWallet,
  type SeededWallet,
} from "./wallet";

type Fixtures = {
  api: FixtureApi;
  /** A locked wallet already stored in this browser, with USDC in the funding wallet and one portfolio. */
  funded: SeededWallet;
};

export const test = base.extend<Fixtures>({
  api: [
    async ({ context, baseURL }, provide) => {
      const api = new FixtureApi(new URL(baseURL ?? "http://127.0.0.1").origin);
      await api.install(context);
      const errors: string[] = [];
      context.on("weberror", (error) => errors.push(String(error.error())));
      await provide(api);
      expect(api.outsiders, "requests that left the test machine").toEqual([]);
      expect(api.unanswered, "API routes the fixtures do not cover").toEqual([]);
      expect(errors, "uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
  funded: async ({ context, api }, provide) => {
    const wallet = await seededWallet();
    api.holdUsdc(wallet.fundingAddress, FUNDING_USDC);
    api.holdUsdc(wallet.portfolio.address, PORTFOLIO_USDC);
    api.holdEarn(wallet.portfolio.address, PORTFOLIO_EARN_USDC);
    // Seeds the first page load only, so a reset in the test stays a reset.
    await context.addInitScript((entries) => {
      if (sessionStorage.getItem("e2e.seeded")) return;
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
      sessionStorage.setItem("e2e.seeded", "1");
    }, wallet.storage);
    await provide(wallet);
  },
});

export { expect };

/** How a request describes its own failure. None of it belongs on a screen. */
const TECHNICAL =
  /failed to fetch|fetch failed|network request|\b(50[0-9]|429)\b(?![.,]\d)|timed? ?out|upstream|\brpc\b|\bjson\b|undefined|exception|\[object/i;

/** Nothing on the page says how a request failed: a person is told about their money, not about requests. */
export async function expectNothingTechnical(page: Page): Promise<void> {
  const shown = await page.locator("body").innerText();
  expect(shown.match(TECHNICAL)?.[0] ?? null, "technical words shown on the page").toBeNull();
}

/** Moves within the single-page app without a reload, which would lock the wallet. */
export async function navigate(page: Page, href: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState(null, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, href);
}
