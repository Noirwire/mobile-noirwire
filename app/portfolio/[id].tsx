import { appCopy } from "@noirwire/shared/copy";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { deviceBalanceReads } from "@/features/portfolio/deviceBalanceReads";
import { PortfolioScreen } from "@/features/portfolio/PortfolioScreen";
import type { PortfolioAction } from "@/features/portfolio/portfolioView";
import { OwnTopBar } from "@/features/portfolio/routeOptions";
import { isAddressFreeParam } from "@/navigation/routeParams";

/** Params: `id`, the portfolio's local id; `view=public` opens it in public view. */
export default function Portfolio() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; view?: string }>();
  const id = isAddressFreeParam(params.id) ? params.id : "";
  const [visit, setVisit] = useState(0);

  // Leaving the screen ends public view and hides a shown address: the next visit starts fresh.
  useFocusEffect(useCallback(() => () => setVisit((current) => current + 1), []));

  function act(action: PortfolioAction) {
    switch (action.to) {
      case "fund":
        return router.push({ pathname: "/fund", params: { id } });
      case "invest":
      case "rebalance":
        return router.push({ pathname: "/pie-order", params: { portfolio: id, mode: action.to } });
      case "buy":
        return router.push({ pathname: "/trade", params: { side: "buy", portfolio: id } });
      case "sell":
        return router.push({
          pathname: "/trade",
          params: { side: "sell", symbol: action.symbol, portfolio: id },
        });
      case "receive":
        return router.push({ pathname: "/receive", params: { id } });
      case "send":
        return router.push({ pathname: "/send", params: { portfolio: id } });
      case "editMix":
        return router.push({ pathname: "/pie-builder", params: { portfolio: id } });
      case "tracker":
        return router.push({ pathname: "/markets/[symbol]", params: { symbol: action.symbol } });
    }
  }

  return (
    <>
      <OwnTopBar />
      <PortfolioScreen
        key={visit}
        id={id}
        initialPublic={visit === 0 && params.view === "public"}
        balances={deviceBalanceReads()}
        backLabel={appCopy.nav.home}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        onAction={act}
        onOpenPortfolio={(next) =>
          router.push({ pathname: "/portfolio/[id]", params: { id: next } })
        }
        onSeeAllActivity={() => router.navigate("/activity")}
      />
    </>
  );
}
