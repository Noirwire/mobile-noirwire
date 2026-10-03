import { useRouter } from "expo-router";
import { MarketsScreen } from "@/features/markets/MarketsScreen";

export default function Markets() {
  const router = useRouter();
  return (
    <MarketsScreen
      onOpen={(symbol) => router.push({ pathname: "/markets/[symbol]", params: { symbol } })}
    />
  );
}
