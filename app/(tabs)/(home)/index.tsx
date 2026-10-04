import {
  fundingReceiveParams,
  portfolioParams,
  type HomeTarget,
} from "@noirwire/shared/presentation";
import { useRouter } from "expo-router";
import { HomeScreen } from "@/features/home/HomeScreen";
import { lockNow } from "@/features/wallet/walletActions";
import { portfolioHref, trackerHref } from "@/navigation/detailRoutes";

export default function Home() {
  const router = useRouter();

  function navigate(target: HomeTarget) {
    switch (target.to) {
      case "markets":
        return router.navigate("/markets");
      case "fund":
        return router.push(
          target.portfolioId
            ? { pathname: "/fund", params: portfolioParams(target.portfolioId) }
            : { pathname: "/fund" },
        );
      case "receive":
        return router.push({ pathname: "/receive", params: fundingReceiveParams(target.reveal) });
    }
  }

  return (
    <HomeScreen
      onNavigate={navigate}
      onOpenPortfolio={(id) => router.push(portfolioHref("(home)", id))}
      onOpenTracker={(symbol) => router.push(trackerHref("(home)", symbol))}
      onNewPortfolio={() => router.push("/new-portfolio")}
      onSeeAllActivity={() => router.navigate("/activity")}
      onOpenEarn={() => router.navigate("/earn")}
      onLock={lockNow}
    />
  );
}
