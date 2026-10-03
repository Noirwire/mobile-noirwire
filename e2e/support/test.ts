import { expect, test as base, type Page } from "@playwright/test";
import { FixtureRelay } from "./relay";
import { FUNDING_USDC, PORTFOLIO_USDC, seededWallet, type SeededWallet } from "./wallet";

type Fixtures = {
  relay: FixtureRelay;
  /** A locked wallet already stored in this browser, with USDC in the funding wallet and one portfolio. */
  funded: SeededWallet;
};

export const test = base.extend<Fixtures>({
  relay: [
    async ({ context, baseURL }, provide) => {
      const relay = new FixtureRelay(new URL(baseURL ?? "http://127.0.0.1").origin);
      await relay.install(context);
      const errors: string[] = [];
      context.on("weberror", (error) => errors.push(String(error.error())));
      await provide(relay);
      expect(relay.outsiders, "requests that left the test machine").toEqual([]);
      expect(relay.unanswered, "relay routes the fixtures do not cover").toEqual([]);
      expect(errors, "uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
  funded: async ({ context, relay }, provide) => {
    const wallet = await seededWallet();
    relay.holdUsdc(wallet.fundingAddress, FUNDING_USDC);
    relay.holdUsdc(wallet.portfolio.address, PORTFOLIO_USDC);
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

/** Moves within the single-page app without a reload, which would lock the wallet. */
export async function navigate(page: Page, href: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState(null, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, href);
}
