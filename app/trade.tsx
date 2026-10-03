import {
  isAddressFreeParam,
  portfolioParams,
  readPortfolioParam,
  readSide,
} from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TradeSheet } from "@/features/trade/TradeSheet";
import { SheetRoute } from "@/navigation/sheetRoute";

/** Params: `side`, and optionally `symbol` and `portfolio`, the acting portfolio's local id. */
export default function Trade() {
  const router = useRouter();
  const params = useLocalSearchParams<{ side?: string; symbol?: string; portfolio?: string }>();
  return (
    <>
      <SheetRoute />
      <TradeSheet
        side={readSide(params.side)}
        symbol={isAddressFreeParam(params.symbol) ? params.symbol : null}
        portfolioId={readPortfolioParam(params.portfolio)}
        onClose={() => router.back()}
        onAddMoney={(id) => router.replace({ pathname: "/fund", params: portfolioParams(id) })}
      />
    </>
  );
}
