import { useLocalSearchParams, useRouter } from "expo-router";
import { MarketsScreen } from "@/features/markets/MarketsScreen";
import { UNKNOWN_TRACKER_PARAM } from "@/navigation/deepLinks";
import { trackerHref } from "@/navigation/detailRoutes";

/** Params: `unknown=1`, set by the link allow-list when a link named a tracker that does not exist. */
export default function Markets() {
  const router = useRouter();
  const params = useLocalSearchParams<{ [UNKNOWN_TRACKER_PARAM]?: string }>();
  return (
    <MarketsScreen
      unknownTracker={params[UNKNOWN_TRACKER_PARAM] === "1"}
      onOpen={(symbol) => router.push(trackerHref("(markets)", symbol))}
    />
  );
}
