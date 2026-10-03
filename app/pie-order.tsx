import { useLocalSearchParams, useRouter } from "expo-router";
import { PieOrderSheet } from "@/features/pie/PieOrderSheet";
import { oneParam, SheetRouteOptions } from "@/features/trade/sheetRoute";
import { isAddressFreeParam } from "@/navigation/routeParams";

export default function PieOrder() {
  const router = useRouter();
  const { portfolio, mode } = useLocalSearchParams<{ portfolio?: string; mode?: string }>();
  const id = isAddressFreeParam(portfolio) ? oneParam(portfolio) : null;
  return (
    <>
      <SheetRouteOptions />
      <PieOrderSheet
        portfolioId={id ?? ""}
        mode={mode === "rebalance" ? "rebalance" : "invest"}
        onClose={() => router.back()}
        onAddMoney={(portfolioId) =>
          router.replace({ pathname: "/fund", params: { id: portfolioId } })
        }
      />
    </>
  );
}
