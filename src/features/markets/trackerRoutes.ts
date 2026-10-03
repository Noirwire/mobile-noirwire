import type { Href, useRouter } from "expo-router";
import { Linking } from "react-native";
import type { TrackerIntent } from "./TrackerScreen";

type Router = ReturnType<typeof useRouter>;

/** The issuer's own FAQ. The link carries nothing about the person reading it. */
export const ISSUER_FAQ = "https://docs.xstocks.fi/docs/frequently-asked-questions";

/** Where each choice on a tracker's page leads, for a wallet holder. Only symbols and ids travel in a route. */
export function followTrackerIntent(router: Router, symbol: string, intent: TrackerIntent) {
  const go: Record<TrackerIntent["kind"], () => void> = {
    buy: () => router.push({ pathname: "/trade", params: { side: "buy", symbol } }),
    sell: () => router.push({ pathname: "/trade", params: { side: "sell", symbol } }),
    createWallet: () => router.replace("/welcome"),
    createPortfolio: () => router.push("/new-portfolio"),
    portfolio: () =>
      intent.kind === "portfolio" &&
      router.push({ pathname: "/portfolio/[id]", params: { id: intent.id } } as Href),
    risks: () => router.push("/settings/risks"),
    issuer: () => void Linking.openURL(ISSUER_FAQ),
    markets: () => router.replace("/markets"),
  };
  go[intent.kind]();
}
