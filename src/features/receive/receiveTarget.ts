import { isAddressFreeParam } from "@/navigation/routeParams";
import type { ReceiveTarget } from "./receiveView";

const FUNDING = "funding";

/**
 * The sheet's target from its route parameters: the funding wallet unless a
 * portfolio id is given. A parameter shaped like an address is refused and
 * falls back to the funding wallet, masked.
 */
export function receiveTarget(
  id: string | string[] | undefined,
  reveal: string | string[] | undefined,
): ReceiveTarget {
  if (isAddressFreeParam(id) && id !== FUNDING) return { kind: "portfolio", id };
  return { kind: "funding", reveal: reveal === "1" && (id === undefined || id === FUNDING) };
}
