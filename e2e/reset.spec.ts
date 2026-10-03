import { unlock } from "./support/onboarding";
import { expect, test } from "./support/test";

test("Settings reset deletes the wallet only after RESET is typed", async ({ page, funded }) => {
  await page.goto("/");
  await unlock(page, funded.password);
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
  await expect(page.getByRole("button", { name: "Create my wallet" })).toBeVisible();
  const vaultFiles = await page.evaluate(
    () => Object.keys(localStorage).filter((key) => key.startsWith("noirwire.vault/")).length,
  );
  expect(vaultFiles).toBe(0);
});
