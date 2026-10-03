import { useRouter } from "expo-router";
import { EarnScreen } from "@/features/earn/EarnScreen";

export default function Earn() {
  const router = useRouter();
  return (
    <EarnScreen
      onReadRisks={() => router.push("/settings/risks")}
      onNewPortfolio={() => router.push("/new-portfolio")}
      onMoveMoney={(id) => router.push({ pathname: "/fund", params: { id } })}
    />
  );
}
