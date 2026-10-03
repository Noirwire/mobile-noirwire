import { commonCopy, marketsCopy, tradeCopy } from "@noirwire/shared/copy";
import { shares, usd, type PriceRange, type Wallet } from "@noirwire/shared/domain";
import {
  activePortfolios,
  asset,
  isLivePrice,
  positionAcross,
  shownUnits,
} from "@noirwire/shared/wallet";
import { mobileMarketsCopy as mobile } from "./copy";
import { changeView, type ChangeView } from "./marketsView";
import type { History } from "./useMarketData";

/**
 * What a tracker's page shows, as display-ready values. A mobile view model:
 * a candidate to move into @noirwire/shared/presentation.
 */

export type TrackerAction =
  | { kind: "buy"; label: string; disabled: boolean }
  | { kind: "sell"; label: string; disabled: boolean }
  | { kind: "createWallet"; label: string }
  | { kind: "createPortfolio"; label: string };

export type TrackerView =
  | { kind: "notFound"; title: string; detail: string; back: string }
  | {
      kind: "tracker";
      symbol: string;
      name: string;
      caption: string;
      star: { watched: boolean; label: string } | null;
      price:
        { live: true; figure: string; tag: string } | { live: false; figure: string; note: string };
      change: (ChangeView & { caption: string }) | null;
      orderNote: string;
      chart:
        | { kind: "loading"; text: string }
        | { kind: "none"; text: string }
        | { kind: "ready"; points: number[]; label: string; source: string };
      ranges: { value: PriceRange; label: string };
      holding: {
        title: string;
        quantity: string | null;
        value: string | null;
        rows: { id: string; label: string }[];
        none: string | null;
      } | null;
      about: {
        title: string;
        lines: string[];
        notOffered: string;
        retired: string | null;
        readRisks: string;
        issuerDetails: string;
      };
      actions: TrackerAction[];
      bottomNote: string | null;
      offline: string | null;
    };

export type TrackerState = {
  symbol: string;
  /** The unlocked wallet, or null for a visitor. */
  wallet: Wallet | null;
  updatedAt: number | null;
  online: boolean;
  range: PriceRange;
  history: History;
};

function spokenDollars(amount: number) {
  const [whole, cents] = amount.toFixed(2).split(".");
  return `${whole} dollars ${Number(cents)} cents`;
}

export function trackerView(state: TrackerState): TrackerView {
  const { symbol, wallet, range, history, online } = state;
  const entry = asset(symbol);
  if (!entry || entry.kind !== "stock") {
    return {
      kind: "notFound",
      title: marketsCopy.detail.notFound,
      detail: marketsCopy.noMatch,
      back: mobile.detail.backToMarkets,
    };
  }
  const live = state.updatedAt !== null && isLivePrice(symbol);
  const visitor = wallet === null;
  const portfolios = wallet ? activePortfolios(wallet) : [];
  const holders = portfolios.filter((portfolio) =>
    portfolio.holdings.some((holding) => holding.symbol === symbol && holding.amount > 0),
  );
  const position = wallet ? positionAcross(wallet, symbol) : null;
  const held = position !== null && position.amount > 0;
  const quantity = (amount: number) => {
    const shown = shownUnits(symbol, amount);
    return shown === undefined ? commonCopy.unavailable : `${shares(shown)} ${symbol}`;
  };
  const rangeName = mobile.detail.rangeName[range];

  const chart: Extract<TrackerView, { kind: "tracker" }>["chart"] =
    history.status === "loading"
      ? { kind: "loading", text: marketsCopy.detail.loadingHistory }
      : history.status === "none"
        ? { kind: "none", text: marketsCopy.detail.noChart(range) }
        : (() => {
            const first = history.points[0];
            const last = history.points[history.points.length - 1];
            const percent = ((last - first) / first) * 100;
            return {
              kind: "ready" as const,
              points: history.points,
              label: mobile.detail.chartLabel(
                rangeName.charAt(0).toUpperCase() + rangeName.slice(1),
                spokenDollars(first),
                spokenDollars(last),
                mobile.changeSpoken(percent).replace(" today", ""),
              ),
              source: marketsCopy.detail.historySource,
            };
          })();

  const actions: TrackerAction[] = visitor
    ? [{ kind: "createWallet", label: marketsCopy.detail.createWallet }]
    : portfolios.length === 0
      ? [{ kind: "createPortfolio", label: mobile.detail.createPortfolio }]
      : [
          ...(entry.retired
            ? []
            : [{ kind: "buy" as const, label: marketsCopy.detail.buy, disabled: !online }]),
          ...(holders.length > 0
            ? [{ kind: "sell" as const, label: marketsCopy.detail.sell, disabled: !online }]
            : []),
        ];

  return {
    kind: "tracker",
    symbol,
    name: entry.name,
    caption: marketsCopy.issuerLine(symbol, entry.issuer),
    star: wallet
      ? {
          watched: wallet.watchlist.includes(symbol),
          label: marketsCopy.watchToggle(wallet.watchlist.includes(symbol), symbol),
        }
      : null,
    price: live
      ? { live: true, figure: usd(entry.price), tag: mobile.detail.indicative }
      : { live: false, figure: marketsCopy.atReview, note: marketsCopy.detail.priceUnavailable },
    change: live ? { ...changeView(entry.change24h), caption: marketsCopy.detail.past24h } : null,
    orderNote: live ? mobile.detail.liveNote : marketsCopy.detail.quoteNote,
    chart,
    ranges: { value: range, label: mobile.detail.rangeLabel },
    holding: visitor
      ? null
      : {
          title: marketsCopy.detail.yourHolding,
          quantity: held ? quantity(position.amount) : null,
          value: held
            ? live
              ? marketsCopy.detail.holdingValue(usd(position.value))
              : marketsCopy.detail.valueWaiting
            : null,
          rows: holders.map((portfolio) => ({
            id: portfolio.id,
            label: mobile.detail.holdingRow(
              portfolio.label,
              quantity(
                portfolio.holdings.find((holding) => holding.symbol === symbol)?.amount ?? 0,
              ),
            ),
          })),
          none: held ? null : marketsCopy.detail.notOwned,
        },
    about: {
      title: mobile.detail.aboutAndRisk,
      lines: [
        marketsCopy.detail.aboutTracker(symbol, entry.name),
        marketsCopy.detail.issuerControl,
        mobile.detail.dividends,
      ],
      notOffered: tradeCopy.tracker.notOffered,
      retired: entry.retired ? marketsCopy.detail.retired(symbol) : null,
      readRisks: mobile.detail.readRisks,
      issuerDetails: marketsCopy.detail.issuerDetails,
    },
    actions,
    bottomNote:
      !visitor && portfolios.length > 0 && entry.retired && holders.length === 0
        ? marketsCopy.detail.retiredMobile
        : null,
    offline: !visitor && !online ? mobile.detail.offline : null,
  };
}
