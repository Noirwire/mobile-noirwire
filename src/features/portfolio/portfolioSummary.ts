import { portfolioCopy } from "@noirwire/shared/copy";
import {
  changeTone,
  deltaText,
  resolvePortfolioIcon,
  usd,
  type Portfolio,
  type PortfolioIcon,
} from "@noirwire/shared/domain";
import { cashOf, isLivePrice, portfolioDayChange, portfolioValue } from "@noirwire/shared/wallet";
import { mobileHomeCopy } from "../home/copy";

/** The tone a change is set in: a gain, a loss, or dim for exactly nothing. */
export type ChangeTone = "safe" | "danger" | "dim";

export function toneOf(value: number): ChangeTone {
  const tone = changeTone(value);
  return tone === "neutral" ? "dim" : tone;
}

/**
 * Whether every holding in a portfolio can be valued right now: cash always,
 * anything else only with a live price. A value that needs a missing price is
 * unavailable, never partial.
 */
export function portfolioPriced(portfolio: Portfolio, updatedAt: number | null): boolean {
  return portfolio.holdings.every(
    (holding) =>
      holding.amount <= 0 ||
      holding.symbol === "USDC" ||
      (updatedAt !== null && isLivePrice(holding.symbol)),
  );
}

/** What a portfolio holds besides its cash. */
export function heldPositions(portfolio: Portfolio) {
  return portfolio.holdings.filter((holding) => holding.symbol !== "USDC" && holding.amount > 0);
}

export type PortfolioRowView = {
  id: string;
  name: string;
  icon: PortfolioIcon;
  line: string;
  value: string;
  change: { text: string; tone: ChangeTone } | null;
  spoken: string;
};

/** One portfolio as a row of the list on Home: its mark, name, one useful line, value and day. */
export function portfolioRowView(portfolio: Portfolio, updatedAt: number | null): PortfolioRowView {
  const cash = usd(cashOf(portfolio));
  const positions = heldPositions(portfolio).length;
  const line = portfolio.pie
    ? mobileHomeCopy.portfolioLine.pie(portfolio.pie.length, cash)
    : positions > 0
      ? mobileHomeCopy.portfolioLine.holdings(cash, positions)
      : portfolioCopy.card.noInvestments;
  const value = portfolioPriced(portfolio, updatedAt)
    ? usd(portfolioValue(portfolio))
    : portfolioCopy.card.valueUnavailable;
  const day = portfolioDayChange(portfolio, updatedAt);
  const change = day ? { text: deltaText(day.percent, day.usd), tone: toneOf(day.usd) } : null;
  return {
    id: portfolio.id,
    name: portfolio.label,
    icon: resolvePortfolioIcon(portfolio.icon),
    line,
    value,
    change,
    spoken: [portfolio.label, line, value, change?.text].filter(Boolean).join(", "),
  };
}
