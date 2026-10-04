import { readPortfolioParam } from "@noirwire/shared/presentation";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ReceiveSheet } from "@/features/receive/ReceiveSheet";
import { SheetRoute } from "@/navigation/sheetRoute";

/**
 * Params: `portfolio`, the receiving portfolio's local id. Never an address.
 * The funding wallet's own address is in the add-money sheet.
 */
export default function Receive() {
  const router = useRouter();
  const portfolioId = readPortfolioParam(useLocalSearchParams<{ portfolio?: string }>().portfolio);
  if (!portfolioId) return <Redirect href="/add-money" />;
  return (
    <>
      <SheetRoute />
      <ReceiveSheet portfolioId={portfolioId} onClose={() => router.back()} />
    </>
  );
}
