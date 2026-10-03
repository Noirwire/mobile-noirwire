import { useLocalSearchParams, useRouter } from "expo-router";
import { PieBuilderSheet } from "@/features/pie/PieBuilderSheet";
import { oneParam, SheetRouteOptions } from "@/features/trade/sheetRoute";
import { isAddressFreeParam } from "@/navigation/routeParams";

export default function PieBuilder() {
  const router = useRouter();
  const { portfolio } = useLocalSearchParams<{ portfolio?: string }>();
  const id = isAddressFreeParam(portfolio) ? oneParam(portfolio) : null;
  return (
    <>
      <SheetRouteOptions />
      <PieBuilderSheet portfolioId={id ?? ""} onClose={() => router.back()} />
    </>
  );
}
