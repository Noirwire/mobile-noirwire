import { portfolioParams } from "@noirwire/shared/presentation";
import { useRouter } from "expo-router";
import { EarnScreen } from "@/features/earn/EarnScreen";

export default function Earn() {
  const router = useRouter();
  return (
    <EarnScreen
      onNewPortfolio={() => router.push("/new-portfolio")}
      onMoveMoney={(id) => router.push({ pathname: "/fund", params: portfolioParams(id) })}
    />
  );
}
