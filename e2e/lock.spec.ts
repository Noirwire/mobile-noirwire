import { unlock } from "./support/onboarding";
import { expect, test } from "./support/test";

test("a stored wallet opens on Unlock, refuses a wrong password, and locks again", async ({
  page,
  funded,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/unlock$/);
  await expect(page.getByRole("heading", { name: "Unlock NoirWire" })).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lock wallet" })).toBeHidden();

  await unlock(page, funded.password);
  await page.getByRole("button", { name: "Lock wallet" }).click();
  await expect(page).toHaveURL(/\/unlock$/);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");

  await unlock(page, funded.password);
  await expect(page.getByText("Investing", { exact: true }).first()).toBeVisible();
});
