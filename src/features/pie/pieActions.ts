import { mapPortfolio } from "@noirwire/shared/application";
import type { PieSlice } from "@noirwire/shared/domain";
import { getPlatform } from "@noirwire/shared/platform";
import { pieProblem, updateWallet } from "@noirwire/shared/wallet";

/**
 * Saves a pie's target mix. Nothing is bought or sold: what the pie already
 * holds stays where it is. Resolves to whether the change was stored.
 */
export async function savePieMix(portfolioId: string, pie: PieSlice[]): Promise<boolean> {
  if (pieProblem(pie)) return false;
  const stored = await updateWallet((current) =>
    mapPortfolio(current, portfolioId, (portfolio) => ({ ...portfolio, pie })),
  );
  if (stored) getPlatform().track("pie_mix_edited", { stocks: pie.length });
  return stored;
}
