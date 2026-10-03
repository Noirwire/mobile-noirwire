import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { mobileSendCopy } from "@/features/send/copy";
import { SendScreen } from "@/features/send/SendScreen";
import { Placeholder } from "@/navigation/Placeholder";
import { isAddressFreeParam } from "@/navigation/routeParams";

const SHEET_ROUTE = {
  headerShown: false,
  presentation: "transparentModal",
  animation: "none",
} as const;

/** Params: `id`, the sending portfolio's local id. */
export default function Send() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!isAddressFreeParam(id)) {
    return <Placeholder title="Send" detail={mobileSendCopy.notAPortfolio} />;
  }
  return (
    <>
      <Stack.Screen options={SHEET_ROUTE} />
      <SendScreen
        portfolioId={id}
        onClose={() => router.back()}
        onMoveMoney={(portfolio) =>
          router.replace({ pathname: "/fund", params: { id: portfolio } })
        }
      />
    </>
  );
}
