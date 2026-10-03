import { useLocalSearchParams, useRouter } from "expo-router";
import { SheetRoute } from "@/features/portfolio/routeOptions";
import { ReceiveSheet } from "@/features/receive/ReceiveSheet";
import { receiveTarget } from "@/features/receive/receiveTarget";

/**
 * Params: `id`, "funding" (the default) or a portfolio's local id, and
 * `reveal=1` to show the funding address at once. Never an address.
 */
export default function Receive() {
  const router = useRouter();
  const { id, reveal } = useLocalSearchParams<{ id?: string; reveal?: string }>();
  return (
    <>
      <SheetRoute />
      <ReceiveSheet target={receiveTarget(id, reveal)} onClose={() => router.back()} />
    </>
  );
}
