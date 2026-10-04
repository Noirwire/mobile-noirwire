import { DetailStack } from "@/navigation/routes/detailStack";

/** A link straight to a detail screen still has Home beneath it to go back to. */
export const unstable_settings = { initialRouteName: "index" };

export default function HomeStack() {
  return <DetailStack root="index" />;
}
