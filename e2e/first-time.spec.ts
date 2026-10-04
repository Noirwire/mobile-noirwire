import { createWallet, unlock } from "./support/onboarding";
import { expect, expectNothingTechnical, test } from "./support/test";

/**
 * What a first-time user meets: Welcome, the one way to add money, a
 * tracker's page, and the two places the app used to stop them: buying with
 * nothing to invest, and opening the app while NoirWire cannot be reached.
 */

const CANNOT_REACH = /Can't reach NoirWire/;
const AN_ADDRESS_IN_GROUPS = /^([1-9A-HJ-NP-Za-km-z]{1,4} ){5}[1-9A-HJ-NP-Za-km-z]{1,4}\n/;
const A_PRICE_AND_A_DATE = /^\$\d[\d,]*\.\d\d · .+\d/;

test("a new user goes from Welcome to the add-money sheet, with the funding wallet address already shown", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button")).toHaveText([
    "Create a wallet",
    "Restore a wallet",
    "Explore trackers",
  ]);
  // The UI kit link is a development build's own: this export is a production one.
  await expect(page.getByText(/UI kit/)).toHaveCount(0);

  await createWallet(page);
  // One button brings money in, and nothing else on Home offers an address.
  await expect(page.getByRole("button", { name: /add money|funding|address/i })).toHaveCount(1);

  await page.getByRole("button", { name: "Add money", exact: true }).click();
  const sheet = page.getByRole("dialog");
  // The sheet's own title, then one heading for each of the three steps.
  await expect(sheet.getByRole("heading")).toHaveCount(4);
  // The product never volunteers a limitation in the main path.
  const sheetText = (await sheet.textContent()) ?? "";
  expect(sheetText).not.toMatch(/cannot/i);
  expect(sheetText).not.toMatch(/\byet\b/i);
  // The address is on the sheet as it opens: two lines of groups of four, with nothing to tap first.
  await expect(sheet.getByText(AN_ADDRESS_IN_GROUPS)).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Copy funding wallet address" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /show/i })).toHaveCount(0);

  // What it costs opens in place: closed at first, and the address stays on screen beside it.
  const costs = sheet.getByRole("button", { name: "What does it cost?" });
  const opened = page.url();
  await expect(costs).toHaveAttribute("aria-expanded", "false");
  await expect(sheet.getByText(/0\.1% \+ \$0\.20\.$/)).toHaveCount(0);
  await costs.click();
  await expect(costs).toHaveAttribute("aria-expanded", "true");
  await expect(sheet.getByText(/privately: 0\.1% \+ \$0\.20/)).toBeVisible();
  await expect(sheet.getByText(AN_ADDRESS_IN_GROUPS)).toBeVisible();
  expect(page.url()).toBe(opened);
});

test("a stored wallet unlocks while NoirWire cannot be reached, and is told about the connection", async ({
  page,
  api,
  funded,
}) => {
  api.down();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unlock NoirWire" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText(CANNOT_REACH)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/balances/)).toHaveCount(0);
  await expectNothingTechnical(page);

  await unlock(page, funded.password);
  // What needs the chain says so itself; what the phone stores is shown.
  await expect(page.getByText("$457.33").first()).toBeVisible();
  await expect(page.getByText(CANNOT_REACH)).toHaveCount(0);

  api.up();
  await expect(page.getByText(/500\.00 USDC has arrived in your funding wallet/)).toBeVisible();
});

test("a tracker's page leads with what it is, and its chart reads out the point held", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore trackers" }).click();
  await page.getByRole("textbox", { name: "Search trackers" }).fill("nvda");
  await page
    .getByRole("button", { name: /^NVIDIA, NVDAx, \$235\.91/ })
    .first()
    .click();

  await expect(page.getByRole("heading", { name: "NVIDIA", exact: true })).toBeVisible();
  await expect(page.getByText(/^High \$\d/)).toBeVisible();
  await expect(page.getByText(/^Low \$\d/)).toBeVisible();
  // The issuer's powers and its own page sit behind "Read the risks", never in the main column.
  await expect(page.getByText(/multiplier|burn|jupiter|freeze or remove/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /issuer/i })).toHaveCount(0);

  const chart = page.getByRole("slider", { name: /^1 day price chart\./ });
  await expect(chart).not.toHaveAttribute("aria-valuetext", /./);
  const box = await chart.boundingBox();
  if (!box) throw new Error("The chart has no place on the page.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, { steps: 4 });
  await expect(chart).toHaveAttribute("aria-valuetext", A_PRICE_AND_A_DATE);
  await page.mouse.up();
  await expect(chart).not.toHaveAttribute("aria-valuetext", /./);

  const risks = page.getByRole("button", { name: "Read the risks" });
  await risks.click();
  await expect(risks).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/freeze or remove/)).toBeVisible();
  await expect(page.getByRole("button", { name: /issuer/i })).toBeVisible();
});

test("a cold open with no wallet and no answer from NoirWire says so within the check's limit", async ({
  page,
  api,
}) => {
  api.silent("/v1/rpc");
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveText(CANNOT_REACH, { timeout: 12_000 });
  await expect(page.getByText(/balances/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
});

test("a new pie keeps each tracker's name beside its share, and asks before throwing the mix away", async ({
  page,
}) => {
  await createWallet(page);
  await page.getByRole("button", { name: "New portfolio" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio", { name: "Pie" }).click();
  await sheet.getByRole("textbox", { name: /tracker/i }).fill("nvda");
  await sheet.getByRole("button", { name: "NVIDIA, NVDAx" }).click();

  // At a phone's width the name keeps its own room on one line, and the whole stepper sits beside it.
  const name = await sheet.getByText("NVIDIA", { exact: true }).boundingBox();
  const share = await sheet.getByRole("textbox", { name: "NVDAx share in percent" }).boundingBox();
  if (!name || !share) throw new Error("The tracker's row has no place in the sheet.");
  expect(name.width).toBeGreaterThan(48);
  expect(name.height).toBeLessThan(30);
  expect(share.x).toBeGreaterThan(name.x + name.width);
  await expect(
    sheet.getByRole("button", { name: "Decrease NVDAx share in percent" }),
  ).toBeVisible();

  // Leaving with a mix typed in asks first, and says what would be lost.
  const asked = new Promise<string>((resolve) =>
    page.once("dialog", (dialog) => {
      resolve(dialog.message());
      void dialog.dismiss();
    }),
  );
  await sheet.getByRole("button", { name: /^Close New/ }).click();
  expect((await asked).split("\n\n")).toHaveLength(2);
  await expect(sheet.getByText("NVIDIA", { exact: true })).toBeVisible();
});

test("buying with nothing to invest says so on the first step, with the way to add money", async ({
  page,
}) => {
  await createWallet(page);
  await page.getByRole("tab", { name: "Markets" }).click();
  await page.getByRole("textbox", { name: "Search trackers" }).fill("nvda");
  await page
    .getByRole("button", { name: /^NVIDIA, NVDAx, \$235\.91/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Buy", exact: true }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("No money in this portfolio yet")).toBeVisible();
  await expect(sheet.getByRole("textbox")).toHaveCount(0);
  await sheet.getByRole("button", { name: "Add money" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Add digital dollars" }),
  ).toBeVisible();
});
