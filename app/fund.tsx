import {
  fundingReceiveParams,
  publicViewParams,
  readPortfolioParam,
} from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FundScreen } from "@/features/funding/FundScreen";
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
        onShowFundingAddress={() =>
          router.replace({ pathname: "/receive", params: fundingReceiveParams(false) })
        }
        onSeePublicView={(id) =>
          router.replace({ pathname: "/portfolio/[id]", params: { id, ...publicViewParams() } })
        }
      />
    </>
  );
}
