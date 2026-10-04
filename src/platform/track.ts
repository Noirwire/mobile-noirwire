import { isOnChain, type EventData, type EventName } from "@noirwire/shared/domain";
import { apiUrl, authorizedFetch } from "@noirwire/shared/infrastructure";
import type { Track } from "@noirwire/shared/platform";

/** An event that coincides with a transaction waits this long, at random, before it is reported, as on the web. */
export const ON_CHAIN_DELAY_MS = { min: 60_000, max: 600_000 };

type TrackDeps = {
  enabled: () => boolean;
  /** The screen the event happened on, already reduced by `screenPath`. */
  screen: () => string;
  later: (run: () => void, ms: number) => void;
  random: () => number;
};

const TABS = new Set(["markets", "earn", "activity", "settings"]);

/**
 * The route as the API's closed list accepts it: a tab, a tracker or a
 * portfolio without its symbol or id, and everything else (onboarding,
 * unlock, home) as the root. Group segments such as `(tabs)` are dropped.
 */
export function screenPath(pathname: string): string {
  const [first, second] = pathname.split("/").filter((part) => part && !part.startsWith("("));
  if (first === "portfolio" && second) return "/portfolios/:id";
  if (first === "markets" && second) return "/markets/:symbol";
  if (first && TABS.has(first)) return `/${first}`;
  return "/";
}

/**
 * The platform's `track`: the shared closed event list, posted to the API's
 * events route like every other request the app makes, only while analytics
 * is on. The API checks every event against the same list and forwards it
 * without the phone's address. A failed post is dropped: analytics never gets
 * in the way of the wallet.
 */
export function apiTrack(deps: TrackDeps): Track {
  const post = (body: object) => {
    if (!deps.enabled()) return;
    void authorizedFetch(apiUrl("events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Counting an event moves nothing, so it may be sent again with a renewed session.
      asksAgain: true,
    }).catch(() => undefined);
  };

  return (event, ...props) => {
    if (!deps.enabled()) return;
    const name: EventName = event;
    const data = props[0] as EventData | undefined;
    const body = { path: deps.screen(), name, ...(data ? { data } : {}) };
    if (!isOnChain(name)) {
      post(body);
      return;
    }
    const { min, max } = ON_CHAIN_DELAY_MS;
    deps.later(() => post(body), min + deps.random() * (max - min));
  };
}
