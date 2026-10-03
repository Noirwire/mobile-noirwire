import { forgetWallet, installTestPlatform } from "../testServices";
import { newPortfolioView } from "./newPortfolioView";
import { portfolioSettingsView, settingsDraft } from "./settingsView";
import { holding, seedLivePrices, unlockedWallet, withHolding } from "./testWallet";

let updatedAt: number;

beforeEach(async () => {
  installTestPlatform();
  updatedAt ??= await seedLivePrices();
});
afterEach(() => forgetWallet());

describe("portfolioSettingsView", () => {
  it("saves only a changed, non-empty name or mark", async () => {
    const [portfolio] = (await unlockedWallet()).portfolios;
    const draft = settingsDraft(portfolio);
    expect(portfolioSettingsView(portfolio, draft, updatedAt).canSave).toBe(false);
    expect(portfolioSettingsView(portfolio, { ...draft, name: "  " }, updatedAt).canSave).toBe(
      false,
    );
    expect(portfolioSettingsView(portfolio, { ...draft, name: "Trips" }, updatedAt).canSave).toBe(
      true,
    );
    expect(
      portfolioSettingsView(
        portfolio,
        { ...draft, icon: { glyph: "sun", tint: "ochre" } },
        updatedAt,
      ).canSave,
    ).toBe(true);
  });

  it("says what an archived portfolio would still hold, priced or not", async () => {
    const [portfolio] = (
      await unlockedWallet((w) => ({
        ...w,
        portfolios: [withHolding(w.portfolios[0], holding("NVDAx", 2))],
      }))
    ).portfolios;
    const draft = settingsDraft(portfolio);
    expect(portfolioSettingsView(portfolio, draft, updatedAt)).toMatchObject({
      sectionTitle: "Archive this portfolio",
      stillHolds:
        "This portfolio still holds $200.00. Archiving hides it; it does not move anything.",
      toggle: "Archive",
    });
    expect(portfolioSettingsView(portfolio, draft, null).stillHolds).toBe(
      "This portfolio still holds investments. Archiving hides it; it does not move anything.",
    );
    expect(portfolioSettingsView({ ...portfolio, archivedAt: 1 }, draft, updatedAt)).toMatchObject({
      sectionTitle: "Restore this portfolio",
      stillHolds: null,
      toggle: "Restore",
    });
  });
});

describe("newPortfolioView", () => {
  it("words a portfolio and a pie, and needs a name and a mix with no problem", () => {
    expect(newPortfolioView("portfolio", "", null)).toMatchObject({
      title: "New portfolio",
      description: "Buy one tracker at a time.",
      placeholder: "Investing",
      suggestions: ["Investing", "Long term", "Everyday"],
      submit: "Create portfolio",
      canSubmit: false,
    });
    expect(newPortfolioView("portfolio", " Mine ", null).canSubmit).toBe(true);
    expect(newPortfolioView("pie", "Core", "Add at least one tracker.")).toMatchObject({
      title: "New pie",
      nameLabel: "Pie name",
      submit: "Create pie",
      submitting: "Creating pie...",
      canSubmit: false,
    });
    expect(newPortfolioView("pie", "Core", null).canSubmit).toBe(true);
  });
});
