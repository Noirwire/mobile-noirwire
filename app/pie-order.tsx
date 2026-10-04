import { readPieMode, readPortfolioParam } from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PieOrderSheet } from "@/features/pie/PieOrderSheet";
import { moneyHref } from "@/navigation/moneyRoutes";
import { SheetRoute } from "@/navigation/sheetRoute";

/** Params: `portfolio`, the pie's local id, and `mode`, "invest" or "rebalance". */
export default function PieOrder() {
  const router = useRouter();
  const { portfolio, mode } = useLocalSearchParams<{ portfolio?: string; mode?: string }>();
  return (
    <>
      <SheetRoute />
      <PieOrderSheet
        portfolioId={readPortfolioParam(portfolio) ?? ""}
        mode={readPieMode(mode)}
        onClose={() => router.back()}
        onNoMoney={(target) => router.replace(moneyHref(target))}
      />
    </>
  );
}
