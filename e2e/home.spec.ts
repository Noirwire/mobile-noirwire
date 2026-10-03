import { unlock } from "./support/onboarding";
import { expect, test } from "./support/test";

test("Home shows a funded wallet's portfolio and the USDC waiting in the funding wallet", async ({
  page,
  funded,
}) => {
  await page.goto("/");
  await unlock(page, funded.password);

  await expect(page.getByText("$457.33").first()).toBeVisible();
  await expect(page.getByText(/500\.00 USDC has arrived in your funding wallet/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Move money to Investing" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Investing, No investments yet, $457.33" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Investing, No investments yet, $457.33" }).click();
  await expect(page).toHaveURL(new RegExp(`/portfolio/${funded.portfolio.id}$`));
  await expect(page.getByText("457.33 USDC cash to invest")).toBeVisible();
  expect(page.url()).not.toContain(funded.portfolio.address);
});
