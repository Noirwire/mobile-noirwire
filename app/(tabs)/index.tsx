import { useRouter } from "expo-router";
import { HomeScreen } from "@/features/home/HomeScreen";
import type { HomeTarget } from "@/features/home/homeView";
import { deviceBalanceReads } from "@/features/portfolio/deviceBalanceReads";
import { lockNow } from "@/features/wallet/walletActions";

export default function Home() {
  const router = useRouter();

  function navigate(target: HomeTarget) {
    switch (target.to) {
      case "markets":
        return router.navigate("/markets");
      case "fund":
        return router.push(
          target.portfolioId
            ? { pathname: "/fund", params: { id: target.portfolioId } }
            : { pathname: "/fund" },
        );
      case "receive":
        return router.push({
          pathname: "/receive",
          params: target.reveal ? { id: "funding", reveal: "1" } : { id: "funding" },
        });
    }
  }

  return (
    <HomeScreen
      balances={deviceBalanceReads()}
      onNavigate={navigate}
      onOpenPortfolio={(id) => router.push({ pathname: "/portfolio/[id]", params: { id } })}
      onOpenTracker={(symbol) => router.push({ pathname: "/markets/[symbol]", params: { symbol } })}
      onNewPortfolio={() => router.push("/new-portfolio")}
      onSeeAllActivity={() => router.navigate("/activity")}
      onLock={lockNow}
    />
  );
}
