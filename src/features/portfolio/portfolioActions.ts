import { createPortfolio } from "@noirwire/shared/application";
import type { PieSlice, Portfolio, PortfolioIcon } from "@noirwire/shared/domain";
import { FUNDING_DERIVATION_INDEX } from "@noirwire/shared/infrastructure";
import { getPlatform } from "@noirwire/shared/platform";
import { pieProblemMessage, refusalMessage } from "@noirwire/shared/presentation";
import {
  createPortfolio as newPortfolio,
  pieProblem,
  serialised,
  getSnapshot,
  isUnlocked,
  unlockedSession,
  updateWallet,
} from "@noirwire/shared/wallet";
import { mobilePortfolioCopy } from "./copy";

const track = () => getPlatform().track;

const store = { snapshot: getSnapshot, update: updateWallet, isUnlocked, serialised };

export type NewPortfolioInput = { label: string; icon?: PortfolioIcon; pie?: PieSlice[] };

/**
 * Derives and stores the next portfolio through the shared use case. Nothing
 * goes on chain: a portfolio is a key derived on this phone. Answers with the
 * portfolio, or the words for why it was not kept.
 */
export async function addPortfolio(
  input: NewPortfolioInput,
): Promise<{ portfolio: Portfolio } | { error: string }> {
  const result = await createPortfolio(
    {
      session: unlockedSession,
      store,
      track: (name, data) => track()(name, data as never),
      pieProblem,
      newPortfolio,
      fundingIndex: FUNDING_DERIVATION_INDEX,
    },
    { label: input.label.trim(), pie: input.pie, icon: input.icon },
  );
  if (result.kind === "created") return { portfolio: result.portfolio };
  if (result.kind === "invalidPie") return { error: pieProblemMessage(result.problem) };
  return {
    error:
      result.reason === "portfolioNotSaved" ? mobilePortfolioCopy.notSaved : refusalMessage(result),
  };
}

function changePortfolio(id: string, change: (portfolio: Portfolio) => Portfolio) {
  return updateWallet((wallet) => ({
    ...wallet,
    portfolios: wallet.portfolios.map((portfolio) =>
      portfolio.id === id ? change(portfolio) : portfolio,
    ),
  }));
}

/** Applies a new name and mark together, as one change. */
export function savePortfolioSettings(id: string, label: string, icon: PortfolioIcon) {
  return changePortfolio(id, (portfolio) => ({ ...portfolio, label: label.trim(), icon }));
}

/** Archiving hides a portfolio from the list; it moves nothing and is undone by restoring. */
export function setArchived(id: string, archived: boolean) {
  track()(archived ? "account_archived" : "account_restored");
  return changePortfolio(id, (portfolio) => ({
    ...portfolio,
    archivedAt: archived ? Date.now() : null,
  }));
}

export function noteSheetOpened(dialog: "receive" | "new_account" | "account_settings") {
  track()("dialog_opened", { dialog });
}

export function noteAddressCopied(what: "funding" | "portfolio") {
  track()("address_copied", { what });
}
