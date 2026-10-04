import { isAddressFreeParam } from "@noirwire/shared/presentation";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { TrackerScreen } from "@/features/markets/TrackerScreen";
import { followTrackerIntent } from "@/features/markets/trackerRoutes";
import { useDetailStack } from "../detailRoutes";

/** Params: `symbol`, the tracker's ticker. */
export function TrackerRoute() {
  const router = useRouter();
  const stack = useDetailStack();
  const focused = useIsFocused();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const safe = isAddressFreeParam(symbol) ? symbol : "";
  return (
    <TrackerScreen
      focused={focused}
      symbol={safe}
      onIntent={(intent) => followTrackerIntent(router, stack, safe, intent)}
    />
  );
}
