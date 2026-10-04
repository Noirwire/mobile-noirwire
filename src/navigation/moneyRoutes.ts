import { portfolioParams, type HomeTarget } from "@noirwire/shared/presentation";
import type { Href } from "expo-router";

/** Where a way to bring money in leads: the add-money sheet, or the sheet that moves it into a portfolio. */
export type MoneyTarget = Extract<HomeTarget, { to: "fund" | "addMoney" }>;

export function moneyHref(target: MoneyTarget): Href {
  if (target.to === "addMoney") return "/add-money";
  return target.portfolioId
    ? { pathname: "/fund", params: portfolioParams(target.portfolioId) }
    : "/fund";
}
