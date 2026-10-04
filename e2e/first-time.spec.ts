import { createWallet, unlock } from "./support/onboarding";
import { expect, expectNothingTechnical, test } from "./support/test";

/**
 * What a first-time user meets: Welcome, the one way to add money, a
 * tracker's page, and the two places the app used to stop them: buying with
 * nothing to invest, and opening the app while NoirWire cannot be reached.
 */

const STEP_TITLES = ["Get USDC", "Send it to your funding wallet", "Move it into a portfolio"];
const CANNOT_REACH = "Can't reach NoirWire. Check your connection and try again.";
const A_PRICE_AND_A_DATE = /^\$\d[\d,]*\.\d\d, .+\d/;

test("a new user goes from Welcome to the add-money sheet, with the funding wallet address already shown", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Invest in US stock trackers. Privately.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No account and no ID check. Only your recovery words can restore your wallet."),
  ).toBeVisible();
  await expect(page.getByRole("button")).toHaveText([
    "Create a wallet",
    "Restore a wallet",
    "Explore trackers",
  ]);
  // The UI kit link is a development build's own: this export is a production one.
  await expect(page.getByText(/UI kit/)).toHaveCount(0);

  await createWallet(page);
  await expect(page.getByText("Ready to invest")).toBeVisible();
  await expect(
    page.getByText("Your money arrives in your funding wallet. Then you move it into a portfolio."),
  ).toBeVisible();
  // One button brings money in, and nothing else on Home offers an address.
  await expect(page.getByRole("button", { name: /add money|funding|address/i })).toHaveCount(1);

  await page.getByRole("button", { name: "Add money", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Add digital dollars" })).toBeVisible();
  for (const title of STEP_TITLES) {
    await expect(sheet.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  // The address is on the sheet as it opens: two lines of groups of four, with nothing to tap first.
  await expect(
    sheet.getByText(/^([1-9A-HJ-NP-Za-km-z]{1,4} ){5}[1-9A-HJ-NP-Za-km-z]{1,4}\n/),
  ).toBeVisible();
  await expect(sheet.getByText("Network: Solana")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Copy funding wallet address" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /show/i })).toHaveCount(0);

  await sheet.getByRole("button", { name: "What does it cost?" }).click();
  // Costs opens with Settings beneath it, which the router notes in the address.
  await expect(page).toHaveURL(/\/settings\/costs(\?initial=false)?$/);
  await expect(
    page.getByText(/^Moving money into a portfolio privately: 0\.1% \+ \$0\.20\./),
  ).toBeVisible();
  await expect(
    page.getByText("The exact amount is always shown before you confirm."),
  ).toBeVisible();
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
  await expect(page.getByText("NVIDIA tracker · NVDAx")).toBeVisible();
  await expect(
    page.getByText("Follows NVIDIA's share price. You do not own a share."),
  ).toBeVisible();
  await expect(page.getByText("Approximate price")).toBeVisible();
  await expect(page.getByText("The final price is shown before you buy.")).toBeVisible();
  await expect(page.getByText(/^The smallest order is about \$\d+\.$/)).toBeVisible();
  await expect(page.getByText(/^High \$\d/)).toBeVisible();
  await expect(page.getByText(/^Low \$\d/)).toBeVisible();
  await expect(page.getByText(/indicative|multiplier|burn|jupiter/i)).toHaveCount(0);
  await expect(page.getByText(/freeze or remove/)).toHaveCount(0);

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

  await page.getByRole("button", { name: "Read the risks" }).click();
  await expect(
    page.getByText("The company that issues this tracker can freeze or remove it."),
  ).toBeVisible();
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
