import { useRouter } from "expo-router";
import { ResetScreen } from "@/features/reset/ResetScreen";
import { noteResetRefused } from "@/features/reset/resetOutcome";

export default function ResetFromSettings() {
  const router = useRouter();
  return <ResetScreen underHeader onCancel={() => router.back()} onRefused={noteResetRefused} />;
}
