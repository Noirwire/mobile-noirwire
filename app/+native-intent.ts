import { allowedLink } from "@/navigation/deepLinks";

/**
 * Every link that reaches the app from outside it comes through here before
 * the router follows it, on a cold start and while the app is open alike.
 * The allow-list (src/navigation/deepLinks.ts) is the only thing that
 * decides where it leads.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return allowedLink(path);
  } catch {
    return "/";
  }
}
