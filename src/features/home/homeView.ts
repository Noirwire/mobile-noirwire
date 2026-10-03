import { commonCopy, portfolioCopy } from "@noirwire/shared/copy";
import { deltaText, shares, tokenAmount, usd, type Wallet } from "@noirwire/shared/domain";
import {
  activePortfolios,
  archivedPortfolios,
  asset,
  isLivePrice,
  portfolioOverview,
  price,
  shownUnits,
} from "@noirwire/shared/wallet";
import { recentActivity, type ActivityRowView } from "../activity/activityView";
import {
  portfolioRowView,
  toneOf,
  type ChangeTone,
  type PortfolioRowView,
} from "../portfolio/portfolioSummary";
import { mobileHomeCopy as copy } from "./copy";

/** Where a Home control leads. The route file maps each to a screen or sheet. */
export type HomeTarget =
  { to: "markets" } | { to: "fund"; portfolioId?: string } | { to: "receive"; reveal: boolean };

export type HomeAction = { label: string; target: HomeTarget };

export type InvestmentRowView = {
  symbol: string;
  name: string;
  caption: string;
  value: string;
  spoken: string;
};

export type HomeView = {
  total: {
    label: string;
    value: string;
    unavailable: boolean;
    change?: string;
    changeTone: ChangeTone | "faint";
  };
  cash: { label: string; value: string };
  /** Total value, Earn and the funding wallet are all zero: the screen leads with getting money in. */
  empty: boolean;
  /** USDC sitting in the funding wallet, waiting to be moved into a portfolio. */
  waiting: { text: string; action: HomeAction | null } | null;
  primary: HomeAction;
  secondary: HomeAction;
  /** The funding notice holds the one primary button, so both actions render quiet. */
  actionsQuiet: boolean;
  howTo: { steps: { title: string; detail: string }[]; footnote: string };
  portfolios: PortfolioRowView[];
  archived: { heading: string; rows: PortfolioRowView[] };
  investments: InvestmentRowView[];
  recent: ActivityRowView[];
};

const RECENT_ROWS = 3;

function fundingUsdc(wallet: Wallet) {
  return wallet.funding.tokens.USDC ?? 0;
}

function fundingHoldsAnything(wallet: Wallet) {
  return (
    wallet.funding.sol > 0 || Object.values(wallet.funding.tokens).some((amount) => amount > 0)
  );
}

/** Each tracker held across every active portfolio, largest first. */
function investments(
  positions: Map<string, number>,
  updatedAt: number | null,
): InvestmentRowView[] {
  return [...positions.entries()]
    .map(([symbol, held]) => {
      const priced = updatedAt !== null && isLivePrice(symbol);
      const shown = shownUnits(symbol, held);
      const tokens = shown === undefined ? commonCopy.unavailable : shares(shown);
      const name = commonCopy.tracker(asset(symbol)?.name ?? symbol);
      const caption = copy.tokens(symbol, tokens);
      const value = priced ? usd(held * price(symbol)) : commonCopy.priceUnavailable;
      return {
        symbol,
        name,
        caption,
        value,
        spoken: [name, caption, value].join(", "),
        order: priced ? held * price(symbol) : -1,
      };
    })
    .sort((a, b) => b.order - a.order)
    .map(({ order: _order, ...row }) => row);
}

function totalOf(
  overview: ReturnType<typeof portfolioOverview>,
  empty: boolean,
): HomeView["total"] {
  const label = portfolioCopy.home.totalValue;
  if (!overview.valued) {
    return {
      label,
      value: portfolioCopy.home.valueUnavailable,
      unavailable: true,
      change: portfolioCopy.home.waitingForValues,
      changeTone: "faint",
    };
  }
  const value = usd(overview.total);
  if (empty || !overview.hasInvestments)
    return { label, value, unavailable: false, changeTone: "dim" };
  if (!overview.day) {
    return {
      label,
      value,
      unavailable: false,
      change: portfolioCopy.home.noDayChange,
      changeTone: "faint",
    };
  }
  return {
    label,
    value,
    unavailable: false,
    change: copy.heldTrackersDay(deltaText(overview.day.percent, overview.day.usd)),
    changeTone: toneOf(overview.day.usd),
  };
}

/**
 * Spec 2.12. Everything on Home, decided from the unlocked wallet and when
 * prices were last read (null: there is no live price). The combined total
 * and the combined list of trackers exist only here, added up on this phone.
 */
export function homeView(wallet: Wallet, updatedAt: number | null): HomeView {
  const overview = portfolioOverview(wallet, updatedAt);
  const empty =
    overview.valued &&
    overview.total === 0 &&
    !overview.hasInvestments &&
    !fundingHoldsAnything(wallet);
  const usdc = fundingUsdc(wallet);
  const first = activePortfolios(wallet)[0];
  const waiting =
    usdc > 0
      ? {
          text: portfolioCopy.addMoney.arrived(tokenAmount(usdc)),
          action: first
            ? {
                label: portfolioCopy.addMoney.moveTo(first.label),
                target: { to: "fund", portfolioId: first.id } as const,
              }
            : null,
        }
      : null;

  const addMoney: HomeAction = {
    label: copy.addMoney,
    target: usdc > 0 ? { to: "fund" } : { to: "receive", reveal: false },
  };
  const archived = archivedPortfolios(wallet);

  return {
    total: totalOf(overview, empty),
    cash: { label: copy.cashAvailable, value: usd(overview.cash) },
    empty,
    waiting,
    primary: empty
      ? { label: copy.addUsdc, target: { to: "receive", reveal: false } }
      : { label: copy.findTrackers, target: { to: "markets" } },
    secondary: empty
      ? { label: copy.showFundingAddress, target: { to: "receive", reveal: true } }
      : addMoney,
    actionsQuiet: waiting?.action != null,
    howTo: {
      steps: [
        {
          title: portfolioCopy.addMoney.stepGet(commonCopy.solana),
          detail: portfolioCopy.addMoney.stepGetDetail(commonCopy.solana),
        },
        { title: portfolioCopy.addMoney.stepSend, detail: portfolioCopy.addMoney.stepSendDetail },
        { title: portfolioCopy.addMoney.stepMove, detail: portfolioCopy.addMoney.stepMoveDetail },
      ],
      footnote: portfolioCopy.addMoney.footnote,
    },
    portfolios: overview.portfolios.map((portfolio) => portfolioRowView(portfolio, updatedAt)),
    archived: {
      heading: copy.archived(archived.length),
      rows: archived.map((portfolio) => portfolioRowView(portfolio, updatedAt)),
    },
    investments: investments(overview.positions, updatedAt),
    recent: recentActivity(wallet, RECENT_ROWS),
  };
}
