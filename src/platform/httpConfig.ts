import type { HttpConfig } from "@noirwire/shared/infrastructure";

export const CLIENT_HEADER = "X-NoirWire-Client";

/**
 * Every request goes to the relay at `relayUrl` and names this client, which
 * is what lets the relay accept a request with no browser origin: a page on
 * another site cannot add a custom header without a preflight the relay never
 * grants.
 */
export function mobileHttpConfig(relayUrl: string, appVersion: string): HttpConfig {
  const headers = { [CLIENT_HEADER]: `mobile/${appVersion}` };
  return { baseUrl: relayUrl, headers: () => ({ ...headers }) };
}
