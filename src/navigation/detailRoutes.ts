import { useSegments, type Href } from "expo-router";

/**
 * A portfolio's and a tracker's own screens are places inside a tab, so the
 * tab bar stays where it is (spec 1.1 and 1.2). Both are registered in the
 * Home stack and in the Markets stack: one opened from Markets pushes onto
 * Markets, and Back returns there; opened from anywhere else it pushes onto
 * Home. Only an id or a tracker symbol ever travels in these routes.
 */
export type DetailStack = "(home)" | "(markets)";

/** The stack a detail screen opens on from the screen that asks. */
export function useDetailStack(): DetailStack {
  const segments: readonly string[] = useSegments();
  return segments[1] === "(markets)" ? "(markets)" : "(home)";
}

export function portfolioHref(
  stack: DetailStack,
  id: string,
  params: Record<string, string> = {},
): Href {
  return { pathname: `/(tabs)/${stack}/portfolio/[id]`, params: { id, ...params } } as Href;
}

export function trackerHref(stack: DetailStack, symbol: string): Href {
  return { pathname: `/(tabs)/${stack}/markets/[symbol]`, params: { symbol } } as Href;
}
