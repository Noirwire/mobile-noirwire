import { useRouter } from "expo-router";
import { ResetScreen } from "@/features/reset/ResetScreen";

export default function ResetFromUnlock() {
  const router = useRouter();
  return <ResetScreen onCancel={() => router.back()} />;
}
