import type { NetworkCost } from "@noirwire/shared/domain";

/**
 * A network cost as the phone may meet it. The shared planner can fall back
 * to a portfolio paying from the network's own currency; the phone has no
 * flow and no wording for that currency (spec 0.1 rule 7 and section 4), so
 * that case is the relayer being unavailable: nothing is charged and the
 * action waits.
 */
export function phoneCost(cost: NetworkCost): NetworkCost {
  return cost.kind === "ownSol" ? { kind: "unavailable" } : cost;
}
