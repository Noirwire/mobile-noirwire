import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/navigation/Placeholder";
import { isAddressFreeParam } from "@/navigation/routeParams";

export default function Tracker() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  return (
    <Placeholder
      title="Tracker"
      detail={
        isAddressFreeParam(symbol)
          ? "This tracker's price and details will appear here."
          : "This link does not point to a tracker."
      }
      underHeader
    />
  );
}
