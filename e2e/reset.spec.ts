import { unlock } from "./support/onboarding";
import { expect, test } from "./support/test";

/** Where the browser build keeps the app's anonymous session (`src/platform/sessionStore.ts`). */
const SESSION_FILE = "noirwire.vault/noirwire%2Emobile%2Esession.value";

test("Settings reset deletes the wallet only after RESET is typed", async ({ page, funded }) => {
  await page.goto("/");
  await unlock(page, funded.password);
  const sessionBefore = await page.evaluate((key) => localStorage.getItem(key), SESSION_FILE);
  expect(sessionBefore).toContain("e2e-access-1");
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset wallet" }).click();

  await expect(page.getByRole("heading", { name: "Reset wallet" })).toBeVisible();
  const remove = page.getByRole("button", { name: "Delete this wallet" });
  const word = page.getByRole("textbox", { name: "Type RESET to confirm" });
  await expect(remove).toBeDisabled();
  await word.fill("reset");
  await expect(remove).toBeDisabled();
  await word.fill("RESET");
  await expect(remove).toBeEnabled();
  await remove.click();

  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("button", { name: "Create a wallet" })).toBeVisible();
  // Nothing of the wallet is left. The session it was used with went with
  // it: at most a new one is there, started by whatever the app asked next.
  const left = await page.evaluate(() =>
    Object.entries(localStorage).filter(([key]) => key.startsWith("noirwire.vault/")),
  );
  expect(left.filter(([key]) => key !== SESSION_FILE)).toEqual([]);
  expect(left.some(([, value]) => value.includes("e2e-access-1"))).toBe(false);
});
