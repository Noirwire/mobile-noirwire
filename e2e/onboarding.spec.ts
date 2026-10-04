import { createWallet, finishWithSuggestedPassword } from "./support/onboarding";
import { expect, test } from "./support/test";

/** A phrase made for these tests alone. It has never held anything and must never be funded. */
const TEST_ONLY_PHRASE =
  "style report excuse fitness region hour enroll honey broccoli already surge leisure";

test("creates a wallet after the phrase check and lands on an empty Home", async ({ page }) => {
  await createWallet(page);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Add money" })).toBeVisible();
  await expect(page.getByText("No investments yet", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Home" })).toHaveAttribute("aria-selected", "true");
});

test("refuses a wrong word in the phrase check", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a wallet" }).click();
  await page.getByRole("button", { name: "Reveal phrase" }).click();
  const labels = await page
    .locator('[aria-label^="Word "]')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("aria-label") ?? ""));
  const words = labels.map((label) => label.split(", ")[1]);
  await page.getByRole("checkbox", { name: "I have saved these words for the next step." }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const prompt = await page.getByText(/^Which word is number \d+\?$/).textContent();
  const right = words[Number(prompt?.match(/\d+/)?.[0]) - 1];
  const choices = page.getByRole("button", { name: /^[a-z]+$/ });
  const names = await choices.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent ?? ""),
  );
  const wrong = names.find((name) => name !== right);
  expect(wrong).toBeDefined();
  await page.getByRole("button", { name: wrong, exact: true }).click();

  await expect(page.getByText(/^Check word \d+ on your paper\.$/)).toBeVisible();
  await expect(page.getByText("Question 2 of 3")).toBeHidden();
});

test("imports a wallet from a recovery phrase", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Restore a wallet" }).click();
  await page.getByRole("textbox", { name: "Recovery phrase" }).fill(TEST_ONLY_PHRASE);
  await page.getByRole("button", { name: "Continue" }).click();

  // Nothing was found under either set of addresses, so there is no choice to make.
  await expect(page.getByRole("heading", { name: "Wallet imported." })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByText("Nothing found yet. This phrase will open a new, empty wallet."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where did this phrase come from?" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await finishWithSuggestedPassword(page);
  await expect(page.getByRole("button", { name: "Add money" })).toBeVisible();
});
