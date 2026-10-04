import { unlock } from "./support/onboarding";
import { expect, expectNothingTechnical, test } from "./support/test";

/**
 * The anonymous session every request carries. The app obtains and renews it
 * by itself: a person is never asked for anything and never told about it.
 */

const CANNOT_REACH = "We can't show your balances right now. Your money has not moved. Try again.";
const BALANCES_STALE =
  "We couldn't update your balances. What you see may be out of date. Pull down to try again.";

/** Words that would tell a person about the session. None belongs on a screen. */
const SESSION_WORDS = /session|access token|bearer|sign(ed)? in|log(ged)? in|expired|authori[sz]/i;

async function expectNoWordOfTheSession(page: import("@playwright/test").Page) {
  const shown = await page.locator("body").innerText();
  expect(shown.match(SESSION_WORDS)?.[0] ?? null, "words about the session on the page").toBeNull();
}

test("a first launch obtains a session, then loads prices with it", async ({ page, api }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Look around first" }).click();
  await expect(page.getByRole("heading", { name: "Top movers" })).toBeVisible();
  await expect(page.getByText("$235.91").first()).toBeVisible();
  await expectNoWordOfTheSession(page);
  await expectNothingTechnical(page);

  // The session is the first thing asked for, with nothing about the device or a wallet.
  expect(api.requests[0]).toEqual({ method: "POST", path: "/v1/session", token: null });
  expect(api.sessions).toEqual({ started: 1, renewed: 0, expiredAnswers: 0 });
  const others = api.requests.slice(1);
  expect(others.map((request) => request.path)).toContain("/v1/prices");
  expect(others.every((request) => request.token === "e2e-access-1")).toBe(true);

  // It is kept in the app's plain storage, and nowhere in a wallet record: there is no wallet yet.
  const stored = await page.evaluate(() =>
    Object.entries(localStorage).filter(([, value]) => value.includes("e2e-access-1")),
  );
  expect(stored.map(([key]) => key)).toEqual(["noirwire.vault/noirwire%2Emobile%2Esession.value"]);
});

test("an expired session is replaced by a new one without a word on screen", async ({
  page,
  api,
  funded,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unlock NoirWire" })).toBeVisible();
  expect(api.sessions.started).toBe(1);

  api.expireSessions();
  await unlock(page, funded.password);

  await expect(page.getByText("$457.33").first()).toBeVisible();
  await page.getByRole("tab", { name: "Markets" }).click();
  await expect(page.getByRole("heading", { name: "Top movers" })).toBeVisible();
  await expect(page.getByText("$235.91").first()).toBeVisible();
  await page.getByRole("tab", { name: "Home" }).click();
  await expect(page.getByText(BALANCES_STALE)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expectNoWordOfTheSession(page);
  await expectNothingTechnical(page);

  expect(api.sessions.expiredAnswers).toBeGreaterThan(0);
  expect(api.sessions.started).toBe(2);
  const last = api.requests[api.requests.length - 1];
  expect(last.token).toBe("e2e-access-2");
});

test("an API that is down at first launch gets the plain message, and Try again recovers", async ({
  page,
  api,
}) => {
  api.down();
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveText(CANNOT_REACH, { timeout: 40_000 });
  await expectNoWordOfTheSession(page);
  await expectNothingTechnical(page);
  await expect(page.getByRole("button", { name: "Create my wallet" })).toHaveCount(0);

  // Still down: the same plain message, never a blank screen.
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveText(CANNOT_REACH, { timeout: 40_000 });

  api.up();
  // After a failure the app holds off for a few seconds before it asks for a
  // session again, so the press that recovers may not be the first.
  await expect(async () => {
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("button", { name: "Create my wallet" })).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ timeout: 60_000 });
  await expectNoWordOfTheSession(page);
  expect(api.sessions.started).toBe(1);
});
