import { isAddressFreeParam } from "@noirwire/shared/presentation";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { TrackerScreen } from "@/features/markets/TrackerScreen";
import { followTrackerIntent } from "@/features/markets/trackerRoutes";

export default function VisitorTracker() {
  const router = useRouter();
  const focused = useIsFocused();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const safe = isAddressFreeParam(symbol) ? symbol : "";
  return (
    <TrackerScreen
      focused={focused}
      symbol={safe}
      visitor
      onIntent={(intent) =>
        intent.kind === "markets"
          ? router.replace("/look-around")
          : followTrackerIntent(router, "(home)", safe, intent)
      }
    />
  );
}
