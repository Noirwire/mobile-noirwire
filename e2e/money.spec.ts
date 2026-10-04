import { unlock } from "./support/onboarding";
import { expect, navigate, test } from "./support/test";

test.beforeEach(async ({ page, funded }) => {
  await page.goto("/");
  await unlock(page, funded.password);
});

test("send to the wallet's own funding address warns that it links the two", async ({
  page,
  funded,
}) => {
  await navigate(page, `/send?portfolio=${funded.portfolio.id}`);
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Send from Investing" })).toBeVisible();
  await sheet.getByRole("textbox", { name: "Recipient address" }).fill(funded.fundingAddress);
  await sheet.getByRole("textbox", { name: "Amount in USDC" }).fill("100");
  await sheet.getByRole("button", { name: "Review" }).click();

  await expect(sheet.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(sheet).toContainText(/Amount\s*100\.00 USDC/);
  await expect(sheet).toContainText(/Network cost\s*0\.01 USDC/);
  await expect(sheet.getByRole("alert")).toContainText("This links the two addresses publicly.");
  const send = sheet.getByRole("button", { name: "Send", exact: true });
  await expect(send).toBeDisabled();
  await expect(sheet.getByText("Confirm that you understand the link this creates.")).toBeVisible();
  await sheet.getByRole("checkbox", { name: "I understand this links them" }).click();
  await expect(sheet.getByText("Confirm that you understand the link this creates.")).toBeHidden();
});

test("a private move reviews what leaves the funding wallet, fees included", async ({ page }) => {
  await page.getByRole("button", { name: "Move to Investing" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Move to portfolio" })).toBeVisible();
  await expect(sheet).toContainText(/Available in funding wallet\s*500\.00 USDC/);
  const amount = sheet.getByRole("textbox", { name: "Amount in USDC" });
  // A comma typed as the decimal separator stays as typed and is read as one.
  await amount.fill("0,5");
  await expect(amount).toHaveValue("0,5");
  await expect(sheet).toContainText(/Arrives in Investing\s*0\.50 USDC/);
  await expect(sheet.getByRole("alert")).toHaveCount(0);
  await amount.fill("100");
  await sheet.getByRole("button", { name: "Review" }).click();

  await expect(sheet.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(sheet).toContainText(/Arrives in Investing\s*100\.00 USDC/);
  await expect(sheet).toContainText(/Total leaving your funding wallet\s*100\.30 USDC/);
  await expect(sheet.getByRole("button", { name: "Move privately" })).toBeEnabled();
});

test("Earn deposit reaches its review from a chosen portfolio", async ({ page }) => {
  await page.getByRole("tab", { name: "Earn" }).click();
  await expect(page.getByText("Current variable rate")).toBeVisible();
  await expect(page.getByText("4.16%").first()).toBeVisible();

  await page.getByRole("button", { name: "Deposit" }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio", { name: "Investing, $457.33 ready to invest" }).click();
  await sheet.getByRole("button", { name: "Continue" }).click();
  await sheet.getByRole("textbox", { name: "Amount in USDC" }).fill("100");
  await sheet.getByRole("button", { name: "Review" }).click();

  await expect(sheet.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(sheet).toContainText(/Leaves Investing\s*100\.00 USDC/);
  await expect(sheet).toContainText(/Goes into Earn\s*100\.00 USDC/);
  await expect(sheet.getByRole("button", { name: "Deposit 100.00 USDC" })).toBeVisible();
});
