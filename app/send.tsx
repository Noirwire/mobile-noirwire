import { sendCopy } from "@noirwire/shared/copy";
import { portfolioParams, readPortfolioParam } from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SendScreen } from "@/features/send/SendScreen";
import { Placeholder } from "@/navigation/Placeholder";
import { SheetRoute } from "@/navigation/sheetRoute";

/** Params: `portfolio`, the sending portfolio's local id. */
export default function Send() {
  const router = useRouter();
  const { portfolio } = useLocalSearchParams<{ portfolio?: string }>();
  const id = readPortfolioParam(portfolio);
  if (!id) return <Placeholder title="Send" detail={sendCopy.notAPortfolio} />;
  return (
    <>
      <SheetRoute />
      <SendScreen
        portfolioId={id}
        onClose={() => router.back()}
        onMoveMoney={(to) => router.replace({ pathname: "/fund", params: portfolioParams(to) })}
      />
    </>
  );
}
