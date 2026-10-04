import { tradeParams } from "@noirwire/shared/presentation";
import type { useRouter } from "expo-router";
import { Linking } from "react-native";
import { portfolioHref, type DetailStack } from "@/navigation/detailRoutes";
import type { TrackerIntent } from "./TrackerScreen";

type Router = ReturnType<typeof useRouter>;

/** The issuer's own FAQ. The link carries nothing about the person reading it. */
export const ISSUER_FAQ = "https://docs.xstocks.fi/docs/frequently-asked-questions";

/** Where each choice on a tracker's page leads, for a wallet holder. Only symbols and ids travel in a route. */
export function followTrackerIntent(
  router: Router,
  stack: DetailStack,
  symbol: string,
  intent: TrackerIntent,
) {
  const go: Record<TrackerIntent["kind"], () => void> = {
    buy: () => router.push({ pathname: "/trade", params: tradeParams({ side: "buy", symbol }) }),
    sell: () => router.push({ pathname: "/trade", params: tradeParams({ side: "sell", symbol }) }),
    createWallet: () => router.replace("/welcome"),
    createPortfolio: () => router.push("/new-portfolio"),
    portfolio: () => intent.kind === "portfolio" && router.push(portfolioHref(stack, intent.id)),
    issuer: () => void Linking.openURL(ISSUER_FAQ),
    markets: () => router.replace("/markets"),
  };
  go[intent.kind]();
}
