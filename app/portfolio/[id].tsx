import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/navigation/Placeholder";
import { isAddressFreeParam } from "@/navigation/routeParams";

export default function Portfolio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Placeholder
      title="Portfolio"
      detail={
        isAddressFreeParam(id)
          ? "This portfolio's holdings and history will appear here."
          : "This link does not point to a portfolio."
      }
      underHeader
    />
  );
}
