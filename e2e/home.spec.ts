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
  // What every portfolio has in Earn together, read from the lending venue, leading to Earn.
  const earning = page.getByRole("button", { name: "Earning, $25.00" });
  await expect(earning).toBeVisible();
  await earning.click();
  await expect(page.getByText("Current variable rate")).toBeVisible();
  await expect(page.getByText("$25.00").first()).toBeVisible();
  await page.getByRole("tab", { name: "Home" }).click();
  await expect(page.getByRole("button", { name: "Move to Investing" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Investing, No investments yet, $457.33" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Investing, No investments yet, $457.33" }).click();
  await expect(page).toHaveURL(new RegExp(`/portfolio/${funded.portfolio.id}$`));
  await expect(page.getByText("457.33 USDC ready to invest")).toBeVisible();
  expect(page.url()).not.toContain(funded.portfolio.address);
});
