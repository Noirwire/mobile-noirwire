import { publicViewParams, readPortfolioParam } from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FundScreen } from "@/features/funding/FundScreen";
import { portfolioHref } from "@/navigation/detailRoutes";
import { SheetRoute } from "@/navigation/sheetRoute";

/** Params: `portfolio`, the receiving portfolio's local id, or none to choose one in the sheet. */
export default function Fund() {
  const router = useRouter();
  const { portfolio } = useLocalSearchParams<{ portfolio?: string }>();
  return (
    <>
      <SheetRoute />
      <FundScreen
        portfolioId={readPortfolioParam(portfolio)}
        onClose={() => router.back()}
        onAddMoney={() => router.replace("/add-money")}
        onSeePublicView={(id) => {
          // The sheet closes first, so the portfolio opens inside its tab, not over it.
          router.back();
          router.push(portfolioHref("(home)", id, publicViewParams()));
        }}
      />
    </>
  );
}
