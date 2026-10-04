import { expect, type Page } from "@playwright/test";

/** Creates a wallet through the real onboarding, passing the phrase check. Returns the password. */
export async function createWallet(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a wallet" }).click();
  await page.getByRole("button", { name: "Reveal phrase" }).click();
  const labels = await page
    .locator('[aria-label^="Word "]')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("aria-label") ?? ""));
  const words = labels.map((label) => label.split(", ")[1]);
  expect(words.length === 12 || words.length === 24).toBe(true);

  await page.getByRole("checkbox", { name: "I have saved these words for the next step." }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (let question = 1; question <= 3; question++) {
    await expect(page.getByText(`Question ${question} of 3`)).toBeVisible();
    const prompt = await page.getByText(/^Which word is number \d+\?$/).textContent();
    const position = Number(prompt?.match(/\d+/)?.[0]);
    await page.getByRole("button", { name: words[position - 1], exact: true }).click();
  }

  return finishWithSuggestedPassword(page);
}

/** Sets a suggested password, declines biometrics if offered, and waits for Home. */
export async function finishWithSuggestedPassword(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Suggest a password" }).click();
  const password = await page.getByLabel("New password", { exact: true }).inputValue();
  expect(password.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Save and finish" }).click();
  await expect(page.getByRole("button", { name: "Lock wallet" })).toBeVisible({ timeout: 60_000 });
  return password;
}

export async function unlock(page: Page, password: string): Promise<void> {
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.getByRole("button", { name: "Lock wallet" })).toBeVisible({ timeout: 60_000 });
}
