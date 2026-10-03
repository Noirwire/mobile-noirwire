import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FundScreen } from "@/features/funding/FundScreen";
import { isAddressFreeParam } from "@/navigation/routeParams";

const SHEET_ROUTE = {
  headerShown: false,
  presentation: "transparentModal",
  animation: "none",
} as const;

/** Params: `id`, the receiving portfolio's local id, or none to choose one in the sheet. */
export default function Fund() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <>
      <Stack.Screen options={SHEET_ROUTE} />
      <FundScreen
        portfolioId={isAddressFreeParam(id) ? id : null}
        onClose={() => router.back()}
        onShowFundingAddress={() =>
          router.replace({ pathname: "/receive", params: { id: "funding" } })
        }
        onSeePublicView={(portfolio) =>
          router.replace({ pathname: "/portfolio/[id]", params: { id: portfolio, view: "public" } })
        }
      />
    </>
  );
}
