import { readPortfolioParam } from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PieBuilderSheet } from "@/features/pie/PieBuilderSheet";
import { SheetRoute } from "@/navigation/sheetRoute";

/** Params: `portfolio`, the pie's local id. */
export default function PieBuilder() {
  const router = useRouter();
  const { portfolio } = useLocalSearchParams<{ portfolio?: string }>();
  return (
    <>
      <SheetRoute />
      <PieBuilderSheet
        portfolioId={readPortfolioParam(portfolio) ?? ""}
        onClose={() => router.back()}
      />
    </>
  );
}
