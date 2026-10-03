import { isAddressFreeParam } from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TrackerScreen } from "@/features/markets/TrackerScreen";
import { followTrackerIntent } from "@/features/markets/trackerRoutes";

export default function Tracker() {
  const router = useRouter();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const safe = isAddressFreeParam(symbol) ? symbol : "";
  return (
    <TrackerScreen symbol={safe} onIntent={(intent) => followTrackerIntent(router, safe, intent)} />
  );
}
