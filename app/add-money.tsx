import { useRouter } from "expo-router";
import { AddMoneySheet } from "@/features/funding/AddMoneySheet";
import { SheetRoute } from "@/navigation/sheetRoute";

export default function AddMoney() {
  const router = useRouter();
  return (
    <>
      <SheetRoute />
      <AddMoneySheet
        onClose={() => router.back()}
        onOpenCosts={() => {
          // The sheet closes first, and Costs opens with Settings beneath it, so Back has somewhere to go.
          router.back();
          router.push("/settings/costs", { withAnchor: true });
        }}
      />
    </>
  );
}
