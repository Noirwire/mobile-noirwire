import { activityCopy, commonCopy } from "@noirwire/shared/copy";
import {
  resolvePortfolioIcon,
  symbolAmount,
  usd,
  type Activity,
  type ActivityKind,
  type PortfolioIcon,
  type Wallet,
} from "@noirwire/shared/domain";
import { activityAmount, asset, isPosition } from "@noirwire/shared/wallet";
import { mobileActivityCopy as copy } from "./copy";
import { dateAndTime, shortDate, spokenDay } from "./dates";

export type ActivityFilter = "all" | "funding" | "transfers" | "trades";

export const ACTIVITY_FILTERS: readonly { id: ActivityFilter; label: string }[] = [
  { id: "all", label: activityCopy.filters.all },
  { id: "funding", label: activityCopy.filters.funding },
  { id: "transfers", label: activityCopy.filters.transfers },
  { id: "trades", label: activityCopy.filters.trades },
];

const FILTER_KINDS: Record<ActivityFilter, readonly ActivityKind[]> = {
  all: ["fund", "send", "buy", "sell"],
  funding: ["fund"],
  transfers: ["send"],
  trades: ["buy", "sell"],
};

/** Which mark leads a row: money in, money out, bought or sold. */
export type ActivityIcon = "in" | "out" | "bought" | "sold";

const ICON: Record<ActivityKind, ActivityIcon> = {
  fund: "in",
  send: "out",
  buy: "bought",
  sell: "sold",
};

/** Money in and sells are gains to the portfolio; sends and buys are spending. */
const INCOMING: Record<ActivityKind, boolean> = {
  fund: true,
  sell: true,
  send: false,
  buy: false,
};

export type ActivityValue = { text: string; tone: "safe" | "ink" | "faint"; priced: boolean };

export type ActivityRowView = {
  id: string;
  icon: ActivityIcon;
  title: string;
  caption: string;
  value: ActivityValue;
  amount: string;
  /** The whole row as one sentence, with the sign spoken rather than coloured. */
  spoken: string;
};

export type ActivitySection = { title: string; rows: ActivityRowView[] };

function trackerName(symbol: string) {
  return commonCopy.tracker(asset(symbol)?.name ?? symbol);
}

/** "Money arrived", "Sent", "Bought NVIDIA tracker", "Sold NVIDIA tracker". */
export function activityTitle(entry: Pick<Activity, "kind" | "symbol">): string {
  switch (entry.kind) {
    case "fund":
    case "send":
      return activityCopy.entry(entry.kind, entry.symbol);
    case "buy":
      return copy.bought(trackerName(entry.symbol));
    case "sell":
      return copy.sold(trackerName(entry.symbol));
  }
}

/**
 * The amount an entry moved, in its own unit: a tracker as it read on the day
 * (the shared rule), cash and anything else in their own format, so USDC
 * reads with two decimals like everywhere else.
 */
export function entryAmount(entry: Pick<Activity, "symbol" | "amount" | "shown">): string {
  return isPosition(entry.symbol)
    ? activityAmount(entry)
    : symbolAmount(entry.symbol, entry.amount);
}

function portfolioName(wallet: Wallet, id: string): string | null {
  return wallet.portfolios.find((portfolio) => portfolio.id === id)?.label ?? null;
}

/** The dollar value at the time with its sign, or "Not priced" when there was no live price. */
export function activityValue(entry: Pick<Activity, "kind" | "usd">): ActivityValue {
  if (!(entry.usd > 0)) return { text: activityCopy.notPriced, tone: "faint", priced: false };
  const incoming = INCOMING[entry.kind];
  return {
    text: `${incoming ? "+" : "-"}${usd(entry.usd)}`,
    tone: incoming ? "safe" : "ink",
    priced: true,
  };
}

export function activityRow(wallet: Wallet, entry: Activity): ActivityRowView {
  const name = portfolioName(wallet, entry.portfolioId) ?? activityCopy.portfolioFallback;
  const title = activityTitle(entry);
  const caption = entry.kind === "send" ? copy.sentCaption(name) : name;
  const value = activityValue(entry);
  const amount = entryAmount(entry);
  const spokenValue = value.priced
    ? `${INCOMING[entry.kind] ? copy.plus : copy.minus} ${usd(entry.usd)}`
    : value.text;
  return {
    id: entry.id,
    icon: ICON[entry.kind],
    title,
    caption,
    value,
    amount,
    spoken: [title, caption, spokenDay(entry.at), spokenValue, amount].join(", "),
  };
}

/** Newest first. */
export function newestFirst(entries: readonly Activity[]): Activity[] {
  return [...entries].sort((a, b) => b.at - a.at);
}

export function filterActivity(entries: readonly Activity[], filter: ActivityFilter): Activity[] {
  return entries.filter((entry) => FILTER_KINDS[filter].includes(entry.kind));
}

function dayKey(at: number) {
  const date = new Date(at);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** "Today", "Yesterday", or the day as "28 Sep 2026", by this phone's calendar. */
export function dayHeading(at: number, now: number): string {
  if (dayKey(at) === dayKey(now)) return copy.today;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(at) === dayKey(yesterday.getTime())) return copy.yesterday;
  return shortDate(at);
}

export type ActivityListView =
  | { kind: "none"; title: string; detail: string }
  | { kind: "noMatch"; title: string }
  | { kind: "list"; sections: ActivitySection[]; more: boolean };

/**
 * The Activity tab: the log on this phone, newest first, filtered, grouped by
 * day, and cut at `limit` rows so a long history loads as the list scrolls.
 */
export function activityListView(
  wallet: Wallet,
  filter: ActivityFilter,
  limit: number,
  now: number,
): ActivityListView {
  if (wallet.activity.length === 0) {
    return { kind: "none", title: activityCopy.empty, detail: copy.emptyDetail };
  }
  const matching = newestFirst(filterActivity(wallet.activity, filter));
  if (matching.length === 0) return { kind: "noMatch", title: activityCopy.noMatch };
  const sections: ActivitySection[] = [];
  for (const entry of matching.slice(0, limit)) {
    const title = dayHeading(entry.at, now);
    const row = activityRow(wallet, entry);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.rows.push(row);
    else sections.push({ title, rows: [row] });
  }
  return { kind: "list", sections, more: matching.length > limit };
}

/** The most recent rows, for Home (all portfolios) or one portfolio's detail. */
export function recentActivity(
  wallet: Wallet,
  count: number,
  portfolioId?: string,
): ActivityRowView[] {
  const entries = portfolioId
    ? wallet.activity.filter((entry) => entry.portfolioId === portfolioId)
    : wallet.activity;
  return newestFirst(entries)
    .slice(0, count)
    .map((entry) => activityRow(wallet, entry));
}

export type ActivityDetailView = {
  title: string;
  headline: string;
  headlineTone: ActivityValue["tone"];
  portfolio: { id: string; name: string; icon: PortfolioIcon } | null;
  portfolioFallback: string;
  date: string;
  amount: string;
  value: string;
  /** Only for a send: the address the user entered, held back until asked for. */
  recipient: string | null;
};

/** Everything this phone recorded about one entry, or null when there is no such entry. */
export function activityDetailView(wallet: Wallet, id: string): ActivityDetailView | null {
  const entry = wallet.activity.find((item) => item.id === id);
  if (!entry) return null;
  const value = activityValue(entry);
  const amount = entryAmount(entry);
  const portfolio = wallet.portfolios.find((item) => item.id === entry.portfolioId);
  return {
    title: activityTitle(entry),
    headline: value.priced ? value.text : amount,
    headlineTone: value.priced ? value.tone : "ink",
    portfolio: portfolio
      ? { id: portfolio.id, name: portfolio.label, icon: resolvePortfolioIcon(portfolio.icon) }
      : null,
    portfolioFallback: activityCopy.portfolioFallback,
    date: dateAndTime(entry.at),
    amount,
    value: value.priced ? usd(entry.usd) : activityCopy.notPriced,
    recipient: entry.kind === "send" && entry.counterparty ? entry.counterparty : null,
  };
}
