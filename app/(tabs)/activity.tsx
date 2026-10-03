import { useRouter } from "expo-router";
import { ActivityScreen } from "@/features/activity/ActivityScreen";

export default function Activity() {
  const router = useRouter();
  return (
    <ActivityScreen
      onOpenPortfolio={(id) => router.push({ pathname: "/portfolio/[id]", params: { id } })}
    />
  );
}
