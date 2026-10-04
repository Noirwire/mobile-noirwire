import { useRouter } from "expo-router";
import { FundingWalletScreen } from "@/features/funding/FundingWalletScreen";

export default function FundingWallet() {
  const router = useRouter();
  return (
    <FundingWalletScreen
      onMove={() => router.push("/fund")}
      onAddMoney={() => router.push("/add-money")}
    />
  );
}
