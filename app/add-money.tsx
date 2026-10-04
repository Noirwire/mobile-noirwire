import { useRouter } from "expo-router";
import { AddMoneySheet } from "@/features/funding/AddMoneySheet";
import { SheetRoute } from "@/navigation/sheetRoute";

export default function AddMoney() {
  const router = useRouter();
  return (
    <>
      <SheetRoute />
      <AddMoneySheet onClose={() => router.back()} />
    </>
  );
}
