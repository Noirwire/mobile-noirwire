import { pieCopy, portfolioCopy } from "@noirwire/shared/copy";
import { mobilePortfolioCopy as copy } from "./copy";

export type NewKind = "portfolio" | "pie";

export const NEW_KINDS: readonly NewKind[] = ["portfolio", "pie"];

export type NewPortfolioView = {
  title: string;
  kindsLabel: string;
  kindLabels: Record<NewKind, string>;
  description: string;
  lead: string;
  nameLabel: string;
  placeholder: string;
  suggestions: readonly string[];
  submit: string;
  submitting: string;
  canSubmit: boolean;
};

/**
 * Spec 2.14. A name only the user sees, trimmed and not empty; for a pie, a
 * mix with no problem as well (the builder's own problem line is the reason).
 */
export function newPortfolioView(
  kind: NewKind,
  name: string,
  mixProblem: string | null,
): NewPortfolioView {
  const named = name.trim().length > 0;
  const kinds = copy.create.kinds;
  const pie = kind === "pie";
  return {
    title: pie ? portfolioCopy.create.titlePie : portfolioCopy.create.titlePortfolio,
    kindsLabel: portfolioCopy.create.kindsLabel,
    kindLabels: { portfolio: kinds.portfolio.title, pie: kinds.pie.title },
    description: kinds[kind].description,
    lead: pie ? portfolioCopy.create.pieLead : copy.create.portfolioLead,
    nameLabel: pie ? pieCopy.builder.nameLabel : portfolioCopy.create.nameLabel,
    placeholder: pie ? pieCopy.builder.namePlaceholder : portfolioCopy.create.namePlaceholder,
    suggestions: pie ? [] : portfolioCopy.create.suggestions,
    submit: pie ? portfolioCopy.create.pieSubmit : portfolioCopy.create.submit,
    submitting: pie ? portfolioCopy.create.pieCreating : portfolioCopy.create.creating,
    canSubmit: named && (!pie || mixProblem === null),
  };
}
