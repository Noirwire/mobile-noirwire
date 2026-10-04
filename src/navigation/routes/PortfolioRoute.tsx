import { appCopy } from "@noirwire/shared/copy";
import {
  isAddressFreeParam,
  pieOrderParams,
  portfolioParams,
  readPublicView,
  tradeParams,
  type PortfolioAction,
} from "@noirwire/shared/presentation";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { PortfolioScreen } from "@/features/portfolio/PortfolioScreen";
import { portfolioHref, trackerHref, useDetailStack } from "../detailRoutes";

/** Params: `id`, the portfolio's local id; `view=public` opens it in public view. */
export function PortfolioRoute() {
  const router = useRouter();
  const stack = useDetailStack();
  const params = useLocalSearchParams<{ id: string; view?: string }>();
  const id = isAddressFreeParam(params.id) ? params.id : "";
  const [visit, setVisit] = useState(0);

  // Leaving the screen ends public view and hides a shown address: the next visit starts fresh.
  useFocusEffect(useCallback(() => () => setVisit((current) => current + 1), []));

  function act(action: PortfolioAction) {
    switch (action.to) {
      case "fund":
        return router.push({ pathname: "/fund", params: portfolioParams(id) });
      case "invest":
      case "rebalance":
        return router.push({ pathname: "/pie-order", params: pieOrderParams(id, action.to) });
      case "buy":
        return router.push({
          pathname: "/trade",
          params: tradeParams({ side: "buy", portfolioId: id }),
        });
      case "sell":
        return router.push({
          pathname: "/trade",
          params: tradeParams({ side: "sell", symbol: action.symbol, portfolioId: id }),
        });
      case "receive":
        return router.push({ pathname: "/receive", params: portfolioParams(id) });
      case "send":
        return router.push({ pathname: "/send", params: portfolioParams(id) });
      case "editMix":
        return router.push({ pathname: "/pie-builder", params: portfolioParams(id) });
      case "tracker":
        return router.push(trackerHref(stack, action.symbol));
    }
  }

  return (
    <PortfolioScreen
      key={visit}
      id={id}
      initialPublic={visit === 0 && readPublicView(params.view)}
      backLabel={stack === "(markets)" ? appCopy.nav.markets : appCopy.nav.home}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      onAction={act}
      onOpenPortfolio={(next) => router.push(portfolioHref(stack, next))}
      onSeeAllActivity={() => router.navigate("/activity")}
    />
  );
}
