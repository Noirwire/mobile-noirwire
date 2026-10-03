import { activityCopy, commonCopy, pieCopy, portfolioCopy } from "@noirwire/shared/copy";
import {
  REBALANCE_DRIFT,
  needsRebalance,
  resolvePortfolioIcon,
  symbolAmount,
  tokenAmount,
  usd,
  type Portfolio,
  type PortfolioIcon,
  type Wallet,
} from "@noirwire/shared/domain";
import { pendingActionNote } from "@noirwire/shared/presentation";
import {
  asset,
  cashOf,
  holdingValue,
  isLivePrice,
  isPosition,
  piePriced,
  pieSlices,
  portfolioValue,
  shownAmount,
  shownUnits,
} from "@noirwire/shared/wallet";
import { entryAmount, recentActivity, type ActivityRowView } from "../activity/activityView";
import { shortDate } from "../activity/dates";
import { mobilePortfolioCopy as copy } from "./copy";
import { heldPositions, portfolioPriced } from "./portfolioSummary";

/** What a control on the portfolio screen asks for. The route maps each to a sheet. */
export type PortfolioAction =
  | { to: "fund" }
  | { to: "invest" }
  | { to: "rebalance" }
  | { to: "buy" }
  | { to: "sell"; symbol: string }
  | { to: "receive" }
  | { to: "send" }
  | { to: "editMix" }
  | { to: "tracker"; symbol: string };

export type ActionButton = { label: string; action: PortfolioAction; disabled?: boolean };

export type HoldingRowView = {
  key: string;
  name: string;
  caption: string;
  amount: string;
  /** Dollars, "Price unavailable", or nothing for cash and unpriced other assets. */
  value: string | null;
  /** Trackers open their own screen; cash and anything else do not. */
  tracker: string | null;
  sell: { label: string; disabled: boolean; reason: string | null } | null;
  spoken: string;
};

export type MixSliceView = {
  symbol: string;
  name: string;
  line: string;
  /** Two points or more from target: said in words as well as colour. */
  drift: "over" | "under" | null;
  trailing: string;
  sell: string | null;
  /** The bar under the row: the current share, and where the target sits. */
  current: number;
  target: number;
};

export type MixView = {
  title: string;
  edit: string | null;
  target: number[];
  current: number[] | undefined;
  centre: { label: string; value: string | null };
  ringLabel: string;
  slices: MixSliceView[];
};

export type PortfolioDetailView = {
  kind: "found";
  id: string;
  name: string;
  icon: PortfolioIcon;
  kindLine: string;
  valueLabel: string;
  value: string;
  valueUnavailable: boolean;
  cashLine: string;
  archived: { title: string; lead: string; restore: string; settings: string } | null;
  pending: string | null;
  primary: ActionButton | null;
  rebalance: ActionButton | null;
  quiet: ActionButton[];
  /** Why Send cannot be pressed, when it cannot. */
  sendReason: string | null;
  mix: MixView | null;
  holdings: { title: string; rows: HoldingRowView[] } | null;
  empty: { title: string; button: ActionButton; caption: string | null } | null;
  activity: { title: string; rows: ActivityRowView[]; empty: string };
};

export type PortfolioView =
  PortfolioDetailView | { kind: "missing"; message: string; back: string };

const RECENT_ROWS = 8;
const USDC = "USDC";

function priced(symbol: string, updatedAt: number | null) {
  return updatedAt !== null && isLivePrice(symbol);
}

function trackerName(symbol: string) {
  return commonCopy.tracker(asset(symbol)?.name ?? symbol);
}

function holdingRows(
  portfolio: Portfolio,
  updatedAt: number | null,
  exclude: ReadonlySet<string>,
  archived: boolean,
): HoldingRowView[] {
  const rows: (HoldingRowView & { order: number })[] = [];
  for (const holding of portfolio.holdings) {
    if (holding.amount <= 0 || exclude.has(holding.symbol)) continue;
    const { symbol } = holding;
    if (symbol === USDC) {
      const amount = symbolAmount(USDC, holding.amount);
      rows.push({
        key: symbol,
        name: copy.detail.cashName,
        caption: USDC,
        amount,
        value: null,
        tracker: null,
        sell: null,
        spoken: [copy.detail.cashName, amount].join(", "),
        order: Number.POSITIVE_INFINITY,
      });
      continue;
    }
    const live = priced(symbol, updatedAt);
    const value = live ? usd(holdingValue(holding)) : null;
    if (isPosition(symbol)) {
      const name = trackerName(symbol);
      const amount = shownAmount(symbol, holding.amount);
      const readable = shownUnits(symbol, holding.amount) !== undefined;
      const shownValue = value ?? commonCopy.priceUnavailable;
      rows.push({
        key: symbol,
        name,
        caption: symbol,
        amount,
        value: shownValue,
        tracker: symbol,
        sell: archived
          ? null
          : {
              label: copy.detail.sellLabel(name),
              disabled: !readable,
              reason: readable ? null : commonCopy.balanceUnavailable,
            },
        spoken: [name, amount, shownValue].join(", "),
        order: live ? holdingValue(holding) : -1,
      });
      continue;
    }
    const name = asset(symbol)?.name ?? symbol;
    const amount = symbolAmount(symbol, holding.amount);
    rows.push({
      key: symbol,
      name,
      caption: symbol,
      amount,
      value,
      tracker: null,
      sell: null,
      spoken: [name, amount, value].filter(Boolean).join(", "),
      order: -2,
    });
  }
  return rows.sort((a, b) => b.order - a.order).map(({ order: _order, ...row }) => row);
}

function percent(value: number) {
  return value.toFixed(1);
}

function mixView(portfolio: Portfolio, updatedAt: number | null, archived: boolean): MixView {
  const slices = pieSlices(portfolio);
  const invested = slices.some((slice) => slice.amount > 0);
  const live = piePriced(portfolio, updatedAt);
  const measured = invested && live;
  const sliceViews: MixSliceView[] = slices.map((slice) => {
    const gap = slice.actual - slice.weight;
    const drift =
      measured && Math.abs(gap) >= REBALANCE_DRIFT ? (gap > 0 ? "over" : "under") : null;
    const now = measured ? percent(slice.actual) : null;
    const trailing =
      slice.amount <= 0 ? pieCopy.mix.notBought : live ? usd(slice.value) : pieCopy.mix.unpriced;
    return {
      symbol: slice.symbol,
      name: trackerName(slice.symbol),
      line:
        now === null
          ? copy.mix.targetLine(slice.weight)
          : `${copy.mix.targetLine(slice.weight)} · ${copy.mix.nowShare(now, drift)}`,
      drift,
      trailing,
      sell: slice.amount > 0 && !archived ? copy.detail.sellLabel(trackerName(slice.symbol)) : null,
      current: measured ? slice.actual : 0,
      target: slice.weight,
    };
  });
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const centre = !invested
    ? { label: copy.mix.centreTarget, value: copy.mix.trackers(slices.length) }
    : live
      ? { label: copy.mix.centreInvested, value: usd(total) }
      : { label: copy.mix.centreUnpriced, value: null };
  return {
    title: pieCopy.mix.title,
    edit: archived ? null : pieCopy.mix.edit,
    target: slices.map((slice) => slice.weight),
    current: !invested
      ? slices.map(() => 0)
      : live
        ? slices.map((slice) => slice.actual)
        : undefined,
    centre,
    ringLabel: copy.mix.ringLabel(
      slices.map((slice, index) =>
        copy.mix.sliceSpoken(
          sliceViews[index].name,
          slice.weight,
          sliceViews[index].current > 0 ? percent(slice.actual) : null,
          sliceViews[index].drift,
        ),
      ),
    ),
    slices: sliceViews,
  };
}

function actions(portfolio: Portfolio, updatedAt: number | null, empty: boolean) {
  const cash = cashOf(portfolio);
  const holdsAnything = portfolio.holdings.some((holding) => holding.amount > 0);
  const primary: ActionButton =
    cash <= 0
      ? { label: portfolioCopy.detail.moveMoneyHere, action: { to: "fund" } }
      : portfolio.pie
        ? { label: portfolioCopy.detail.invest, action: { to: "invest" } }
        : { label: copy.detail.buyTracker, action: { to: "buy" } };
  const quiet: ActionButton[] = [
    { label: portfolioCopy.detail.receive, action: { to: "receive" } },
    { label: portfolioCopy.detail.send, action: { to: "send" }, disabled: !holdsAnything },
    ...(cash > 0 ? [{ label: copy.detail.addMoney, action: { to: "fund" } } as const] : []),
  ];
  const slices = portfolio.pie ? pieSlices(portfolio) : [];
  const rebalance =
    portfolio.pie && piePriced(portfolio, updatedAt) && needsRebalance(slices)
      ? { label: portfolioCopy.detail.rebalance, action: { to: "rebalance" } as const }
      : null;
  return {
    primary: empty ? null : primary,
    rebalance,
    quiet,
    sendReason: holdsAnything ? null : copy.detail.sendDisabled,
  };
}

/**
 * Spec 2.13. One portfolio: its value, what it holds and what can be done
 * with it, decided from the wallet and when prices were last read (null:
 * there is no live price, so nothing priced shows a number).
 */
export function portfolioView(wallet: Wallet, id: string, updatedAt: number | null): PortfolioView {
  const portfolio = wallet.portfolios.find((entry) => entry.id === id);
  if (!portfolio) {
    return {
      kind: "missing",
      message: portfolioCopy.notFound.message,
      back: copy.detail.backHome,
    };
  }
  const archived = portfolio.archivedAt !== null;
  const cash = cashOf(portfolio);
  const isPie = portfolio.pie !== undefined;
  const empty = !isPie && heldPositions(portfolio).length === 0;
  const valued = portfolioPriced(portfolio, updatedAt);
  const block = actions(portfolio, updatedAt, empty);
  const mix = isPie ? mixView(portfolio, updatedAt, archived) : null;
  const pieSymbols = new Set((portfolio.pie ?? []).map((slice) => slice.symbol));
  const rows = holdingRows(portfolio, updatedAt, pieSymbols, archived);
  const kind = isPie ? portfolioCopy.detail.pie : portfolioCopy.detail.portfolio;

  return {
    kind: "found",
    id: portfolio.id,
    name: portfolio.label,
    icon: resolvePortfolioIcon(portfolio.icon),
    kindLine: copy.detail.kindLine(kind, shortDate(portfolio.createdAt)),
    valueLabel: portfolioCopy.detail.value,
    value: valued ? usd(portfolioValue(portfolio)) : portfolioCopy.detail.valueUnavailable,
    valueUnavailable: !valued,
    cashLine: portfolioCopy.detail.cashToInvest(tokenAmount(cash)),
    archived: archived
      ? {
          title: portfolioCopy.detail.archivedTitle,
          lead: portfolioCopy.detail.archivedLead,
          restore: copy.detail.restore,
          settings: portfolioCopy.detail.settings,
        }
      : null,
    pending: portfolio.pendingAction
      ? pendingActionNote("portfolio", portfolio.pendingAction.what, "waiting")
      : null,
    primary: archived ? null : block.primary,
    rebalance: archived ? null : block.rebalance,
    quiet: archived ? [] : block.quiet,
    sendReason: archived ? null : block.sendReason,
    mix,
    holdings:
      empty || rows.length === 0
        ? null
        : {
            title: isPie ? portfolioCopy.holdings.titleInPie : portfolioCopy.holdings.title,
            rows,
          },
    empty:
      empty && !archived
        ? {
            title: copy.detail.emptyTitle,
            button:
              cash > 0
                ? { label: copy.detail.addFirstTracker, action: { to: "buy" } }
                : { label: portfolioCopy.detail.moveMoneyHere, action: { to: "fund" } },
            caption: cash > 0 ? null : copy.detail.addMoneyFirst,
          }
        : null,
    activity: {
      title: portfolioCopy.detail.recentActivity,
      rows: recentActivity(wallet, RECENT_ROWS, portfolio.id),
      empty: portfolioCopy.detail.nothingMoved,
    },
  };
}

export type PublicViewModel = {
  address: string;
  holdings: { key: string; text: string }[];
  transactions: { id: string; kind: string; amount: string; date: string }[];
};

/**
 * What someone with this portfolio's address can see, as far as this phone
 * knows: tickers and amounts as last read, and this phone's own entries for
 * it. No name the user gave, nothing from any other portfolio, and nothing
 * fetched to draw it.
 */
export function publicViewModel(portfolio: Portfolio, wallet: Wallet): PublicViewModel {
  return {
    address: portfolio.address,
    holdings: portfolio.holdings
      .filter((holding) => holding.amount > 0)
      .map((holding) => {
        const shown = shownUnits(holding.symbol, holding.amount);
        return {
          key: holding.symbol,
          text:
            shown === undefined
              ? `${holding.symbol} · ${commonCopy.unavailable}`
              : symbolAmount(holding.symbol, shown),
        };
      }),
    transactions: wallet.activity
      .filter((entry) => entry.portfolioId === portfolio.id)
      .sort((a, b) => b.at - a.at)
      .map((entry) => ({
        id: entry.id,
        kind: activityCopy.entry(entry.kind, entry.symbol),
        amount: entryAmount(entry),
        date: shortDate(entry.at),
      })),
  };
}
