import { useRouter } from "expo-router";
import { ActivityScreen } from "@/features/activity/ActivityScreen";
import { portfolioHref } from "@/navigation/detailRoutes";

export default function Activity() {
  const router = useRouter();
  return <ActivityScreen onOpenPortfolio={(id) => router.push(portfolioHref("(home)", id))} />;
}
