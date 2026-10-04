import { createWallet, unlock } from "./support/onboarding";
import { expect, expectNothingTechnical, test } from "./support/test";

/**
 * What the app shows while the relay is slow, and what it says when the
 * relay fails: a signal appears, nothing technical is shown, and nothing
 * waits for ever.
 */

/** A phrase made for these tests alone. It has never held anything and must never be funded. */
const TEST_ONLY_PHRASE =
  "style report excuse fitness region hour enroll honey broccoli already surge leisure";

const IMPORT_FAILED =
  "We couldn't finish importing your wallet. Nothing was saved on this phone. Try again.";
const BALANCES_STALE =
  "We couldn't update your balances. What you see may be out of date. Pull down to try again.";

async function typePhrase(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Import an existing wallet" }).click();
  await page.getByRole("textbox", { name: "Recovery phrase" }).fill(TEST_ONLY_PHRASE);
}

test.describe("import", () => {
  test("shows its progress at once on a slow relay, and still finishes", async ({
    page,
    relay,
  }) => {
    await typePhrase(page);
    relay.slow("/api/rpc", 400);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Importing your wallet" })).toBeVisible({
      timeout: 2_000,
    });
    await expect(page.getByLabel("Reading your recovery phrase, Done")).toBeVisible();
    await expect(page.getByLabel("Finding your portfolios, In progress")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expectNothingTechnical(page);

    await expect(
      page.getByRole("heading", { name: "Where did this phrase come from?" }),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("can be cancelled while it runs, with the phrase kept", async ({ page, relay }) => {
    await typePhrase(page);
    relay.silent("/api/rpc");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Importing your wallet" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("textbox", { name: "Recovery phrase" })).toHaveValue(
      TEST_ONLY_PHRASE,
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  test("says plainly that it could not finish on a failing relay, and can be tried again", async ({
    page,
    relay,
  }) => {
    await typePhrase(page);
    relay.failing("/api/rpc");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Importing your wallet" })).toBeVisible();

    await expect(page.getByRole("alert")).toHaveText(IMPORT_FAILED, { timeout: 60_000 });
    await expectNothingTechnical(page);
    await expect(page.getByRole("textbox", { name: "Recovery phrase" })).toHaveValue(
      TEST_ONLY_PHRASE,
    );

    relay.healthy("/api/rpc");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Where did this phrase come from?" }),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("says why a phrase is refused instead of holding Continue back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Import an existing wallet" }).click();
    const phrase = page.getByRole("textbox", { name: "Recovery phrase" });
    await phrase.fill(TEST_ONLY_PHRASE.split(" ").slice(0, 11).join(" "));
    await expect(page.getByText("11 words", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "A recovery phrase is 12 or 24 words. This has 11.",
    );

    await phrase.fill(TEST_ONLY_PHRASE.replace("leisure", "leisur"));
    await expect(page.getByRole("alert")).toHaveText(
      'Word 12, "leisur", is not a recovery phrase word. Check its spelling.',
    );
  });
});

test.describe("Home", () => {
  test("holds the balance's place while a new wallet's first read is slow", async ({
    page,
    relay,
  }) => {
    await page.goto("/");
    relay.slow("/api/rpc", 2_500);
    await createWallet(page);

    await expect(page.getByLabel("Loading").first()).toBeVisible();
    await expectNothingTechnical(page);
    await expect(page.getByText("Total value")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Loading")).toHaveCount(0);
  });

  test("says what may be out of date on a failing relay, and reads again on Try again", async ({
    page,
    relay,
    funded,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Unlock NoirWire" })).toBeVisible();
    relay.failing("/api/rpc");
    await unlock(page, funded.password);

    await expect(page.getByText(BALANCES_STALE)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("$457.33").first()).toBeVisible();
    await expectNothingTechnical(page);

    relay.healthy("/api/rpc");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText(BALANCES_STALE)).toBeHidden({ timeout: 30_000 });
  });

  test("never waits for ever on a relay that does not answer", async ({ page, relay, funded }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Unlock NoirWire" })).toBeVisible();
    relay.silent("/api/rpc");
    await unlock(page, funded.password);

    await expect(page.getByText(BALANCES_STALE)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
    await expectNothingTechnical(page);
  });
});

test.describe("Markets", () => {
  const PRICES_MISSING =
    "We couldn't load prices. They are missing or out of date here, and are asked for again every half minute.";

  test("holds the list's place while prices are slow, then shows them", async ({
    page,
    relay,
    funded,
  }) => {
    relay.slow("/api/prices", 3_000);
    await page.goto("/");
    await unlock(page, funded.password);
    await page.getByRole("tab", { name: "Markets" }).click();

    await expect(page.getByLabel("Loading").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browse all" })).toBeHidden();
    await expectNothingTechnical(page);
    await expect(page.getByRole("heading", { name: "Top movers" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(PRICES_MISSING)).toHaveCount(0);
  });

  test("lists the trackers without prices on a failing relay, and no number that is not live", async ({
    page,
    relay,
    funded,
  }) => {
    relay.failing("/api/prices");
    await page.goto("/");
    await unlock(page, funded.password);
    await page.getByRole("tab", { name: "Markets" }).click();

    await expect(page.getByText(PRICES_MISSING)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Top movers appear when current prices load.")).toBeVisible();
    await expect(page.getByText("No live price").first()).toBeVisible();
    await expect(page.getByText("$235.91")).toHaveCount(0);
    await expectNothingTechnical(page);
  });

  test("stops waiting for prices that never come, and says they are missing", async ({
    page,
    relay,
    funded,
  }) => {
    relay.silent("/api/prices");
    await page.goto("/");
    await unlock(page, funded.password);
    await page.getByRole("tab", { name: "Markets" }).click();

    await expect(page.getByLabel("Loading").first()).toBeVisible();
    await expect(page.getByText(PRICES_MISSING)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole("heading", { name: "Browse all" })).toBeVisible();
    await expectNothingTechnical(page);
  });
});
