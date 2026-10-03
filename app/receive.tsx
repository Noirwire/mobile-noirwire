import { readReceiveTarget } from "@noirwire/shared/presentation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReceiveSheet } from "@/features/receive/ReceiveSheet";
import { SheetRoute } from "@/navigation/sheetRoute";

/**
 * Params: `portfolio`, "funding" (the default) or a portfolio's local id, and
 * `reveal=1` to show the funding address at once. Never an address.
 */
export default function Receive() {
  const router = useRouter();
  const params = useLocalSearchParams<{ portfolio?: string; reveal?: string }>();
  return (
    <>
      <SheetRoute />
      <ReceiveSheet target={readReceiveTarget(params)} onClose={() => router.back()} />
    </>
  );
}
