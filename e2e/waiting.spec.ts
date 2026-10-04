import { createWallet, unlock } from "./support/onboarding";
import { expect, expectNothingTechnical, test } from "./support/test";

/**
 * What the app shows while the API is slow, and what it says when the
 * API fails: a signal appears, nothing technical is shown, and nothing
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
  await page.getByRole("button", { name: "Restore a wallet" }).click();
  await page.getByRole("textbox", { name: "Recovery phrase" }).fill(TEST_ONLY_PHRASE);
}

test.describe("import", () => {
  test("keeps the phrase form on screen on a slow API, with the one top loader running, and still finishes", async ({
    page,
    api,
  }) => {
    await typePhrase(page);
    api.slow("/v1/rpc", 400);
    await page.getByRole("button", { name: "Continue" }).click();

    // No new page: the same form, the field held, Continue still reading
    // "Continue" (disabled), and a Cancel - not a title, a step list or a
    // phrase-import heading.
    await expect(page.getByRole("heading", { name: "Import an existing wallet." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Recovery phrase" })).toHaveValue(
      TEST_ONLY_PHRASE,
    );
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("progressbar")).toBeVisible({ timeout: 2_000 });
    // The one quiet line under the button says what is happening and about how long it takes.
    await expect(
      page.getByText("Checking what this phrase holds. This can take up to a minute."),
    ).toBeVisible();
    await expectNothingTechnical(page);

    await expect(page.getByRole("heading", { name: "Wallet imported." })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("can be cancelled while it runs, with the phrase kept", async ({ page, api }) => {
    await typePhrase(page);
    api.silent("/v1/rpc");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("textbox", { name: "Recovery phrase" })).toHaveValue(
      TEST_ONLY_PHRASE,
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  });

  test("says plainly that it could not finish on a failing API, and can be tried again", async ({
    page,
    api,
  }) => {
    await typePhrase(page);
    api.failing("/v1/rpc");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    await expect(page.getByRole("alert")).toHaveText(IMPORT_FAILED, { timeout: 60_000 });
    await expectNothingTechnical(page);
    await expect(page.getByRole("textbox", { name: "Recovery phrase" })).toHaveValue(
      TEST_ONLY_PHRASE,
    );

    api.healthy("/v1/rpc");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Wallet imported." })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("says why a phrase is refused instead of holding Continue back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Restore a wallet" }).click();
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
    api,
  }) => {
    await page.goto("/");
    api.slow("/v1/rpc", 2_500);
    await createWallet(page);

    await expect(page.getByLabel("Loading").first()).toBeVisible();
    await expect(page.getByRole("progressbar").first()).toBeVisible();
    await expectNothingTechnical(page);
    await expect(page.getByText("Total value")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Loading")).toHaveCount(0);
  });

  test("says what may be out of date on a failing API, and reads again on Try again", async ({
    page,
    api,
    funded,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Unlock NoirWire" })).toBeVisible();
    api.failing("/v1/rpc");
    await unlock(page, funded.password);

    await expect(page.getByText(BALANCES_STALE)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("$457.33").first()).toBeVisible();
    await expectNothingTechnical(page);

    api.healthy("/v1/rpc");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText(BALANCES_STALE)).toBeHidden({ timeout: 30_000 });
  });

  test("never waits for ever on an API that does not answer", async ({ page, api, funded }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Unlock NoirWire" })).toBeVisible();
    api.silent("/v1/rpc");
    await unlock(page, funded.password);

    await expect(page.getByText(BALANCES_STALE)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
    await expectNothingTechnical(page);
  });
});

test.describe("Markets", () => {
  const PRICES_MISSING = "We couldn't update prices. What you see may be out of date.";

  test("holds the list's place while prices are slow, then shows them", async ({
    page,
    api,
    funded,
  }) => {
    api.slow("/v1/prices", 3_000);
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

  test("lists the trackers without prices on a failing API, and no number that is not live", async ({
    page,
    api,
    funded,
  }) => {
    api.failing("/v1/prices");
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
    api,
    funded,
  }) => {
    api.silent("/v1/prices");
    await page.goto("/");
    await unlock(page, funded.password);
    await page.getByRole("tab", { name: "Markets" }).click();

    await expect(page.getByLabel("Loading").first()).toBeVisible();
    await expect(page.getByText(PRICES_MISSING)).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole("heading", { name: "Browse all" })).toBeVisible();
    await expectNothingTechnical(page);
  });
});
