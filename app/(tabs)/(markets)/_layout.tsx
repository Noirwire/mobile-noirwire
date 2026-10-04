import { DetailStack } from "@/navigation/routes/detailStack";

/** A link straight to a tracker still has Markets beneath it to go back to. */
export const unstable_settings = { initialRouteName: "markets/index" };

export default function MarketsStack() {
  return <DetailStack root="markets/index" />;
}
