import { findStock } from "@noirwire/shared/infrastructure";

/**
 * The one list of where a link from outside the app may lead (spec 1.4).
 * Everything that arrives through the system, the `noirwire://` scheme or
 * the app's link domain, cold or warm, passes through `allowedLink` before
 * the router sees it:
 *
 * - `/markets`, `/earn`, `/activity`, `/settings`: that tab;
 * - `/markets/<symbol>`: that tracker, when the catalog has it, and Markets
 *   saying "No such investment." when it does not;
 * - anything else: Home.
 *
 * Every parameter a link carries is dropped, so none can prefill an amount, a
 * recipient or a side, name a portfolio, or ask for an address to be shown.
 * No sheet is reachable: not add money, receive, fund, send, trade or any other. What a
 * link may open still depends on the wallet: `visitorLink` is what a phone
 * with no wallet shows for it, and a locked wallet holds it until it is
 * unlocked (WalletGate).
 */

export const HOME_LINK = "/";
export const MARKETS_LINK = "/markets";

/** Markets, told to say that the tracker a link named does not exist. Set here only, never read from a link. */
export const UNKNOWN_TRACKER_PARAM = "unknown";
export const UNKNOWN_TRACKER_LINK = `${MARKETS_LINK}?${UNKNOWN_TRACKER_PARAM}=1`;

/** A tracker a link names opens on the Markets tab's own stack, with Markets beneath it. */
const linkedTrackerPath = (symbol: string) => `/(tabs)/(markets)/markets/${symbol}`;

const TRACKER_PATH = /^\/markets\/([^/]+)$/;

/**
 * A path the app was on, as the router should be asked for it again. A
 * tracker's screen exists in two stacks, so its bare path does not say which.
 */
export function resumePath(pathname: string): string {
  const tracker = TRACKER_PATH.exec(pathname);
  return tracker ? linkedTrackerPath(tracker[1]) : pathname;
}

const TAB_LINKS: ReadonlySet<string> = new Set(["markets", "earn", "activity", "settings"]);

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const WEB_SCHEME = /^https?:\/\//i;

/** The path segments of a link, without its scheme, its domain, its parameters or its fragment. */
function segmentsOf(link: string): string[] {
  const withoutQuery = link.split(/[?#]/)[0];
  const path = WEB_SCHEME.test(withoutQuery)
    ? withoutQuery.replace(WEB_SCHEME, "").replace(/^[^/]*/, "")
    : withoutQuery.replace(SCHEME, "");
  return path.split("/").filter(Boolean).map(decoded);
}

function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

/** Where a link from outside may lead. Never throws; anything not on the list is Home. */
export function allowedLink(link: string): string {
  const segments = segmentsOf(link);
  const [first, second] = segments;
  if (segments.length === 1 && TAB_LINKS.has(first)) return `/${first}`;
  if (segments.length === 2 && first === "markets") {
    const tracker = findStock(second);
    return tracker ? linkedTrackerPath(tracker.symbol) : UNKNOWN_TRACKER_LINK;
  }
  return HOME_LINK;
}

export const VISITOR_MARKETS = "/look-around";

/**
 * What an allowed link opens with no wallet stored: the two markets links,
 * as a visitor sees them. Null for every other link, which opens Welcome.
 */
export function visitorLink(pathname: string, unknownTracker: boolean): string | null {
  if (pathname === MARKETS_LINK) {
    return unknownTracker ? `${VISITOR_MARKETS}?${UNKNOWN_TRACKER_PARAM}=1` : VISITOR_MARKETS;
  }
  const tracker = TRACKER_PATH.exec(pathname);
  if (!tracker) return null;
  const known = findStock(decoded(tracker[1]));
  return known ? `/tracker/${known.symbol}` : `${VISITOR_MARKETS}?${UNKNOWN_TRACKER_PARAM}=1`;
}
