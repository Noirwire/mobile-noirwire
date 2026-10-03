import { isAddressFreeParam } from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TrackerScreen } from "@/features/markets/TrackerScreen";
import { followTrackerIntent } from "@/features/markets/trackerRoutes";

export default function VisitorTracker() {
  const router = useRouter();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const safe = isAddressFreeParam(symbol) ? symbol : "";
  return (
    <TrackerScreen
      symbol={safe}
      visitor
      onIntent={(intent) =>
        intent.kind === "markets"
          ? router.replace("/look-around")
          : followTrackerIntent(router, safe, intent)
      }
    />
  );
}
