import { portfolioCopy } from "@noirwire/shared/copy";
import {
  resolvePortfolioIcon,
  usd,
  type Portfolio,
  type PortfolioIcon,
} from "@noirwire/shared/domain";
import { portfolioValue } from "@noirwire/shared/wallet";
import { mobilePortfolioCopy as copy } from "./copy";
import { portfolioPriced } from "./portfolioSummary";

/** The most characters a portfolio's name may have. */
export const NAME_MAX = 64;

export type SettingsDraft = { name: string; icon: PortfolioIcon };

export type PortfolioSettingsView = {
  title: string;
  nameLabel: string;
  save: string;
  canSave: boolean;
  archived: boolean;
  sectionTitle: string;
  sectionLead: string;
  /** Said above Archive when the portfolio still holds something. */
  stillHolds: string | null;
  toggle: string;
};

/** The draft a settings sheet opens with: the stored name and mark. */
export function settingsDraft(portfolio: Portfolio): SettingsDraft {
  return { name: portfolio.label, icon: resolvePortfolioIcon(portfolio.icon) };
}

/**
 * Spec 2.17. Save needs a name that is not empty once trimmed, and a change to
 * the name or the mark. Archiving moves nothing, so a portfolio that still
 * holds value only says so.
 */
export function portfolioSettingsView(
  portfolio: Portfolio,
  draft: SettingsDraft,
  updatedAt: number | null,
): PortfolioSettingsView {
  const stored = settingsDraft(portfolio);
  const name = draft.name.trim();
  const changed =
    name !== stored.name ||
    draft.icon.glyph !== stored.icon.glyph ||
    draft.icon.tint !== stored.icon.tint;
  const archived = portfolio.archivedAt !== null;
  const holds = portfolio.holdings.some((holding) => holding.amount > 0);
  const stillHolds =
    archived || !holds
      ? null
      : portfolioPriced(portfolio, updatedAt)
        ? copy.settings.stillHolds(usd(portfolioValue(portfolio)))
        : copy.settings.stillHoldsUnpriced;
  return {
    title: portfolioCopy.settings.title,
    nameLabel: portfolioCopy.settings.nameLabel,
    save: copy.settings.save,
    canSave: name.length > 0 && changed,
    archived,
    sectionTitle: archived
      ? portfolioCopy.settings.restoreTitle
      : portfolioCopy.settings.archiveTitle,
    sectionLead: portfolioCopy.settings.archiveLead,
    stillHolds,
    toggle: archived ? copy.settings.restore : copy.settings.archive,
  };
}

/** Whether the draft differs from what is stored, so leaving asks first. */
export function draftChanged(portfolio: Portfolio, draft: SettingsDraft): boolean {
  const stored = settingsDraft(portfolio);
  return (
    draft.name !== stored.name ||
    draft.icon.glyph !== stored.icon.glyph ||
    draft.icon.tint !== stored.icon.tint
  );
}
