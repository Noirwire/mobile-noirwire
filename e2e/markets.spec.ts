import { unlock } from "./support/onboarding";
import { expect, test } from "./support/test";

test("Markets leads to a tracker and a buy order's review, priced from the quote", async ({
  page,
  funded,
}) => {
  await page.goto("/");
  await unlock(page, funded.password);

  await page.getByRole("tab", { name: "Markets" }).click();
  await expect(page.getByRole("heading", { name: "Top movers" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search trackers" }).fill("nvda");
  await page
    .getByRole("button", { name: /^NVIDIA, NVDAx, \$235\.91/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/markets\/NVDAx$/);
  await expect(page.getByText("Historical prices")).toBeVisible();
  await page.getByRole("radio", { name: "1W" }).click();
  await expect(page.getByRole("slider", { name: /^1 week price chart\./ })).toBeVisible();

  await page.getByRole("button", { name: "Buy", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Buy NVIDIA tracker" })).toBeVisible();
  await sheet.getByRole("textbox", { name: "Spend $" }).fill("50");
  await sheet.getByRole("button", { name: "Review buy" }).click();

  await expect(
    sheet.getByRole("heading", {
      name: "Spend $50.00 from Investing, Receive at least 0.2109 NVDAx",
    }),
  ).toBeVisible();
  await expect(sheet).toContainText(/Price for this order\s*\$235\.91 per NVDAx/);
  await expect(sheet).toContainText(/Total cost\s*50\.00 USDC/);
  await expect(sheet.getByRole("alert")).toHaveCount(0);
});
