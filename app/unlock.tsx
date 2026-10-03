import { useRouter } from "expo-router";
import { UnlockScreen } from "@/features/unlock/UnlockScreen";

export default function Unlock() {
  const router = useRouter();
  return <UnlockScreen onReset={() => router.push("/reset")} />;
}
