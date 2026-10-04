import type { HomeTarget } from "@noirwire/shared/presentation";
import { useRouter } from "expo-router";
import { HomeScreen } from "@/features/home/HomeScreen";
import { lockNow } from "@/features/wallet/walletActions";
import { portfolioHref, trackerHref } from "@/navigation/detailRoutes";
import { moneyHref } from "@/navigation/moneyRoutes";

export default function Home() {
  const router = useRouter();

  function navigate(target: HomeTarget) {
    if (target.to === "markets") return router.navigate("/markets");
    router.push(moneyHref(target));
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
