import { useLocalSearchParams, useRouter } from "expo-router";
import { oneParam, SheetRouteOptions } from "@/features/trade/sheetRoute";
import { TradeSheet } from "@/features/trade/TradeSheet";
import { isAddressFreeParam } from "@/navigation/routeParams";

export default function Trade() {
  const router = useRouter();
  const params = useLocalSearchParams<{ side?: string; symbol?: string; portfolio?: string }>();
  const symbol = isAddressFreeParam(params.symbol) ? params.symbol : null;
  const portfolio = isAddressFreeParam(params.portfolio) ? oneParam(params.portfolio) : null;
  return (
    <>
      <SheetRouteOptions />
      <TradeSheet
        side={params.side === "sell" ? "sell" : "buy"}
        symbol={symbol}
        portfolioId={portfolio}
        onClose={() => router.back()}
        onAddMoney={(id) => router.replace({ pathname: "/fund", params: { id } })}
      />
    </>
  );
}
