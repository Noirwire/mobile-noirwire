import { MARKET_PAGE_SIZE, SHELF_SIZE, type MarketCategory } from "@noirwire/shared/application";
import { marketsCopy } from "@noirwire/shared/copy";
import { usd } from "@noirwire/shared/domain";
import {
  asset,
  isLivePrice,
  marketsByCategory,
  searchMarkets,
  topMovers,
} from "@noirwire/shared/wallet";
import { mobileMarketsCopy as mobile } from "./copy";

/**
 * What the Markets screen shows, as display-ready values. A mobile view
 * model: a candidate to move into @noirwire/shared/presentation.
 */

type Listed = { symbol: string; name: string; issuer?: string };

export type ChangeView = { text: string; tone: "safe" | "danger" | "dim" };

export type TrackerRowView = {
  symbol: string;
  name: string;
  caption: string;
  /** The live price, or "At review" when there is none. */
  price: string;
  live: boolean;
  change: ChangeView | null;
  /** Shown in place of the change when there is no live price. */
  noLivePrice: string | null;
  label: string;
  /** Null for a visitor, who has no watchlist. */
  star: { watched: boolean; label: string } | null;
};

/** A daily change: zero, or anything that rounds to it, carries no sign and no gain or loss colour. */
export function changeView(percent: number): ChangeView {
  if (Math.abs(percent) < 0.005) return { text: "0.00%", tone: "dim" };
  return {
    text: `${percent > 0 ? "+" : "-"}${Math.abs(percent).toFixed(2)}%`,
    tone: percent > 0 ? "safe" : "danger",
  };
}

export function trackerRowView(entry: Listed, watchlist: readonly string[] | null): TrackerRowView {
  const live = isLivePrice(entry.symbol);
  const priced = asset(entry.symbol);
  const price = live && priced ? usd(priced.price) : null;
  const change = live && priced ? priced.change24h : null;
  const watched = watchlist?.includes(entry.symbol) ?? false;
  return {
    symbol: entry.symbol,
    name: entry.name,
    caption: marketsCopy.issuerLine(entry.symbol, entry.issuer),
    price: price ?? marketsCopy.atReview,
    live: price !== null,
    change: change === null ? null : changeView(change),
    noLivePrice: price === null ? marketsCopy.noLivePrice : null,
    label: mobile.rowLabel(
      entry.name,
      entry.symbol,
      price,
      change === null ? null : mobile.changeSpoken(change),
    ),
    star:
      watchlist === null
        ? null
        : { watched, label: marketsCopy.watchToggle(watched, entry.symbol) },
  };
}

export type Shelf = { key: string; title: string; trailing: string | null; rows: TrackerRowView[] };

export type MarketsState = {
  query: string;
  category: MarketCategory;
  /** How many rows of the list are shown. */
  shown: number;
  /** The wallet's watchlist, or null for a visitor. */
  watchlist: readonly string[] | null;
  updatedAt: number | null;
};

export type MarketsView = {
  title: string;
  search: { label: string; placeholder: string; clear: string };
  searching: { count: string; rows: TrackerRowView[]; empty: string | null } | null;
  shelves: Shelf[];
  moversWaiting: string | null;
  browse: {
    title: string;
    categories: { category: MarketCategory; label: string; active: boolean }[];
    rows: TrackerRowView[];
    more: string | null;
    empty: { title: string; detail: string } | null;
  };
};

export const PAGE = MARKET_PAGE_SIZE;

export function marketsView(state: MarketsState): MarketsView {
  const { watchlist } = state;
  const visitor = watchlist === null;
  const row = (entry: Listed) => trackerRowView(entry, watchlist);
  const holder = { watchlist: [...(watchlist ?? [])] };
  const query = state.query.trim();

  const searching = query
    ? (() => {
        const rows = searchMarkets(query).map(row);
        return {
          count: marketsCopy.results(rows.length),
          rows,
          empty: rows.length === 0 ? marketsCopy.noMatch : null,
        };
      })()
    : null;

  const movers = topMovers(state.updatedAt).slice(0, SHELF_SIZE).map(row);
  const shelf = (
    key: string,
    title: string,
    rows: TrackerRowView[],
    trailing: string | null = null,
  ) => ({ key, title, trailing, rows }) satisfies Shelf;
  const shelves = [
    shelf("movers", marketsCopy.groups.movers, movers, marketsCopy.dayChange),
    shelf(
      "index",
      marketsCopy.groups.index,
      marketsByCategory(holder, "index").slice(0, SHELF_SIZE).map(row),
    ),
    shelf(
      "companies",
      marketsCopy.groups.companies,
      marketsByCategory(holder, "companies").slice(0, SHELF_SIZE).map(row),
    ),
    ...(visitor
      ? []
      : [
          shelf(
            "watchlist",
            marketsCopy.groups.watchlist,
            marketsByCategory(holder, "watchlist").map(row),
          ),
        ]),
  ].filter((entry) => entry.rows.length > 0);

  const category = visitor && state.category === "watchlist" ? "all" : state.category;
  const listed = marketsByCategory(holder, category);
  const remaining = listed.length - state.shown;
  const categories: MarketCategory[] = visitor
    ? ["all", "companies", "index"]
    : ["all", "companies", "index", "watchlist"];

  return {
    title: mobile.title,
    search: {
      label: mobile.searchLabel,
      placeholder: marketsCopy.searchPlaceholder,
      clear: mobile.clearSearch,
    },
    searching,
    shelves,
    moversWaiting: movers.length === 0 ? marketsCopy.moversWaiting : null,
    browse: {
      title: marketsCopy.browseAll,
      categories: categories.map((entry) => ({
        category: entry,
        label: marketsCopy.categories[entry],
        active: entry === category,
      })),
      rows: listed.slice(0, state.shown).map(row),
      more: remaining > 0 ? mobile.showMore(remaining, PAGE) : null,
      empty:
        listed.length === 0 && category === "watchlist"
          ? { title: mobile.watchlistEmpty, detail: mobile.watchlistEmptyDetail }
          : null,
    },
  };
}
