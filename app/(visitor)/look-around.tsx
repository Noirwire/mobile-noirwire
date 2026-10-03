import { useRouter } from "expo-router";
import { LookAroundScreen } from "@/features/visitor/LookAroundScreen";

export default function LookAround() {
  const router = useRouter();
  return <LookAroundScreen onCreate={() => router.replace("/welcome")} />;
}
